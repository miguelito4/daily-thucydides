import json
import re

def clip_text(text, max_length=824):
    """
    Clips text at a natural break point (sentence or punctuation) before max_length.
    """
    if len(text) <= max_length:
        return text

    # Try to find the last sentence ending before the limit
    text_to_check = text[:max_length]
    
    # First try to break at a sentence
    last_break = text_to_check.rfind('. ')
    if last_break != -1:
        return text[:last_break + 1]
    
    # Then try other punctuation
    for punct in ['; ', '! ', '? ', ', ']:
        last_break = text_to_check.rfind(punct)
        if last_break != -1:
            return text[:last_break + 1] + '...'
    
    # If no punctuation, break at last space
    last_break = text_to_check.rfind(' ')
    if last_break != -1:
        return text[:last_break] + '...'
    
    # Last resort: hard break at limit
    return text[:max_length-3] + '...'

def process_text_content(text_lines):
    # Join lines into paragraphs
    paragraphs = []
    current_paragraph = []
    for line in text_lines:
        if line:
            current_paragraph.append(line)
        elif current_paragraph:
            paragraphs.append(' '.join(current_paragraph))
            current_paragraph = []
    
    # Add final paragraph if exists
    if current_paragraph:
        paragraphs.append(' '.join(current_paragraph))
    
    # Join paragraphs with double newlines and clip
    full_text = '\n\n'.join(paragraphs)
    return clip_text(full_text)

def process_thucydides(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find the start of actual content
    content_start = content.find("BOOK I")
    if content_start == -1:
        print("Error: Could not find the beginning of Book I")
        return
    
    # Remove content before first "BOOK I"
    content = content[content_start:]
    
    # Initialize containers
    passages = []
    current_book = None
    current_chapter = None
    current_text = []
    
    # Process line by line
    lines = content.split('\n')
    for line in lines:
        line = line.strip()
        
        # Skip empty lines
        if not line:
            if current_text:
                current_text.append('')  # Preserve paragraph break
            continue
        
        # Check for new book
        book_match = re.match(r'^BOOK [IVXLCDM]+$', line)
        if book_match:
            # Save previous passage if exists
            if current_text and current_book and current_chapter:
                text = process_text_content(current_text)
                if text:  # Only add if there's actual content
                    passages.append({
                        "book": current_book,
                        "chapter": current_chapter,
                        "text": text
                    })
            current_book = line
            current_text = []
            continue
        
        # Check for new chapter
        chapter_match = re.match(r'^CHAPTER [IVXLCDM]+$', line)
        if chapter_match:
            # Save previous passage if exists
            if current_text and current_book and current_chapter:
                text = process_text_content(current_text)
                if text:  # Only add if there's actual content
                    passages.append({
                        "book": current_book,
                        "chapter": current_chapter,
                        "text": text
                    })
            current_chapter = line
            current_text = []
            continue
        
        # Add line to current text if we have both book and chapter
        if current_book and current_chapter:
            current_text.append(line)
    
    # Add final passage if exists
    if current_text and current_book and current_chapter:
        text = process_text_content(current_text)
        if text:
            passages.append({
                "book": current_book,
                "chapter": current_chapter,
                "text": text
            })
    
    # Save to JSON
    with open('thucydides.json', 'w', encoding='utf-8') as json_file:
        json.dump(passages, json_file, indent=4, ensure_ascii=False)
    
    print(f"Processing complete! Saved {len(passages)} passages to thucydides.json.")
    
    # Print first passage preview
    if passages:
        print("\nFirst passage preview:")
        print(f"Book: {passages[0]['book']}")
        print(f"Chapter: {passages[0]['chapter']}")
        print("\nText preview (first 300 characters):")
        print(f"{passages[0]['text'][:300]}...")

if __name__ == "__main__":
    process_thucydides("thucydides.txt")