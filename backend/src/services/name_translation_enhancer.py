"""
Name Translation Enhancement Service
自動為專有名詞添加中英對照，改善跨語言檢索效果

Example:
    Input:  "Alice felt curious"
    Output: "Alice(愛麗絲) felt curious"
    
    Input:  "愛麗絲感到好奇"
    Output: "愛麗絲(Alice)感到好奇"
"""

import re
import logging
from typing import Dict, List, Tuple

logger = logging.getLogger(__name__)


class NameTranslationEnhancer:
    """
    Enhance documents by adding bilingual name annotations
    """
    
    def __init__(self):
        """Initialize with common name mappings"""
        # English -> Chinese mappings
        self.en_to_zh = {
            # ===== Characters (人物) =====
            "Alice": "愛麗絲",
            "White Rabbit": "白兔",
            "Queen of Hearts": "紅心皇后",
            "Queen": "皇后",
            "King of Hearts": "紅心國王",
            "King": "國王",
            "Cheshire Cat": "柴郡貓",
            "Mad Hatter": "瘋帽子",
            "March Hare": "三月兔",
            "Caterpillar": "毛毛蟲",
            "Duchess": "公爵夫人",
            "Mock Turtle": "假海龜",
            "Gryphon": "獅鷲",
            "Dormouse": "睡鼠",
            "Dodo": "渡渡鳥",
            "Bill the Lizard": "蜥蜴比爾",
            "Knave of Hearts": "紅心傑克",
            
            # ===== Places (地名) =====
            "Wonderland": "仙境",
            "Looking-Glass World": "鏡中世界",
            "Tea Party": "茶會",
            "Queen's Garden": "皇后花園",
            "Rabbit Hole": "兔子洞",
            "Court of Justice": "法庭",
            
            # ===== Organizations/Groups (組織/團體) =====
            "The Royal Court": "王室法庭",
            "Card Soldiers": "撲克牌士兵",
            "Hearts": "紅心",
            "Spades": "黑桃",
            "Diamonds": "方塊",
            "Clubs": "梅花",
            
            # ===== Objects/Items (物品) =====
            "Playing Cards": "撲克牌",
            "Magic Mushroom": "魔法蘑菇",
            "Pocket Watch": "懷錶",
            "Tea Cup": "茶杯",
            "Croquet": "槌球",
        }
        
        # Chinese -> English (reverse mapping)
        self.zh_to_en = {v: k for k, v in self.en_to_zh.items()}
        
        # Compile regex patterns for efficient matching
        self._compile_patterns()
    
    def _compile_patterns(self):
        """Compile regex patterns for name detection"""
        # English name pattern (word boundaries to avoid partial matches)
        en_names = "|".join(re.escape(name) for name in self.en_to_zh.keys())
        self.en_pattern = re.compile(rf'\b({en_names})\b')
        
        # Chinese name pattern
        zh_names = "|".join(re.escape(name) for name in self.zh_to_en.keys())
        self.zh_pattern = re.compile(rf'({zh_names})')
    
    def enhance_english_text(self, text: str) -> str:
        """
        Add Chinese translations to English names
        
        Example:
            Input:  "Alice met the White Rabbit"
            Output: "Alice(愛麗絲) met the White Rabbit(白兔)"
        
        Args:
            text: Original English text
            
        Returns:
            Enhanced text with bilingual annotations
        """
        def replace_name(match):
            en_name = match.group(1)
            zh_name = self.en_to_zh.get(en_name, "")
            if zh_name:
                return f"{en_name}({zh_name})"
            return en_name
        
        enhanced = self.en_pattern.sub(replace_name, text)
        return enhanced
    
    def enhance_chinese_text(self, text: str) -> str:
        """
        Add English translations to Chinese names
        
        Example:
            Input:  "愛麗絲遇到了白兔"
            Output: "愛麗絲(Alice)遇到了白兔(White Rabbit)"
        
        Args:
            text: Original Chinese text
            
        Returns:
            Enhanced text with bilingual annotations
        """
        def replace_name(match):
            zh_name = match.group(1)
            en_name = self.zh_to_en.get(zh_name, "")
            if en_name:
                return f"{zh_name}({en_name})"
            return zh_name
        
        enhanced = self.zh_pattern.sub(replace_name, text)
        return enhanced
    
    def detect_language(self, text: str) -> str:
        """
        Detect if text is primarily English or Chinese
        
        Args:
            text: Text to analyze
            
        Returns:
            "en", "zh", or "mixed"
        """
        # Count Chinese characters
        chinese_chars = len(re.findall(r'[\u4e00-\u9fff]', text))
        # Count English letters
        english_chars = len(re.findall(r'[a-zA-Z]', text))
        
        total = chinese_chars + english_chars
        if total == 0:
            return "en"  # Default
        
        chinese_ratio = chinese_chars / total
        
        if chinese_ratio > 0.5:
            return "zh"
        elif chinese_ratio < 0.1:
            return "en"
        else:
            return "mixed"
    
    def enhance_text(self, text: str, force_language: str = None) -> str:
        """
        Automatically enhance text based on detected language
        
        Args:
            text: Text to enhance
            force_language: Force specific language ("en" or "zh")
            
        Returns:
            Enhanced text with bilingual name annotations
        """
        language = force_language or self.detect_language(text)
        
        if language == "zh":
            enhanced = self.enhance_chinese_text(text)
            logger.debug(f"Enhanced Chinese text: {len(text)} -> {len(enhanced)} chars")
        elif language == "en":
            enhanced = self.enhance_english_text(text)
            logger.debug(f"Enhanced English text: {len(text)} -> {len(enhanced)} chars")
        else:  # mixed
            # Try both enhancements
            enhanced = self.enhance_english_text(text)
            enhanced = self.enhance_chinese_text(enhanced)
            logger.debug(f"Enhanced mixed text: {len(text)} -> {len(enhanced)} chars")
        
        return enhanced
    
    def add_custom_mapping(self, en_name: str, zh_name: str):
        """
        Add a custom name mapping
        
        Args:
            en_name: English name
            zh_name: Chinese translation
        """
        self.en_to_zh[en_name] = zh_name
        self.zh_to_en[zh_name] = en_name
        # Recompile patterns
        self._compile_patterns()
        logger.info(f"Added custom mapping: {en_name} <-> {zh_name}")
    
    def get_statistics(self, original: str, enhanced: str) -> Dict[str, int]:
        """
        Get enhancement statistics
        
        Returns:
            Dictionary with counts of enhancements
        """
        en_matches = len(self.en_pattern.findall(original))
        zh_matches = len(self.zh_pattern.findall(original))
        
        return {
            "original_length": len(original),
            "enhanced_length": len(enhanced),
            "en_names_found": en_matches,
            "zh_names_found": zh_matches,
            "total_enhancements": en_matches + zh_matches
        }


# Example usage
if __name__ == "__main__":
    enhancer = NameTranslationEnhancer()
    
    # Test English text
    en_text = "Alice followed the White Rabbit down the hole."
    enhanced_en = enhancer.enhance_text(en_text)
    print(f"English: {en_text}")
    print(f"Enhanced: {enhanced_en}")
    print()
    
    # Test Chinese text
    zh_text = "愛麗絲跟著白兔跳進了洞裡。"
    enhanced_zh = enhancer.enhance_text(zh_text)
    print(f"Chinese: {zh_text}")
    print(f"Enhanced: {enhanced_zh}")
    print()
    
    # Statistics
    stats = enhancer.get_statistics(en_text, enhanced_en)
    print(f"Statistics: {stats}")
