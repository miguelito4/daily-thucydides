import json
import re

def split_text_into_chunks(text, max_length=824):
    """
    Splits text into chunks of approximately max_length characters,
    breaking at natural points like sentences.
    """
    chunks = []
    
    while text:
        if len(text) <= max_length:
            chunks.append(text)
            break
            
        # Try to find the last sentence ending before the limit
        text_to_check = text[:max_length]
        
        # First try to break at a sentence
        last_break = text_to_check.rfind('. ')
        if last_break != -1:
            chunks.append(text[:last_break + 1])
            text = text[last_break + 2:].lstrip()
            continue
        
        # Then try other punctuation
        for punct in ['; ', '! ', '? ', ', ']:
            last_break = text_to_check.rfind(punct)
            if last_break != -1:
                chunks.append(text[:last_break + 1])
                text = text[last_break + 2:].lstrip()
                break
        else:
            # If no punctuation, break at last space
            last_break = text_to_check.rfind(' ')
            if last_break != -1:
                chunks.append(text[:last_break])
                text = text[last_break + 1:].lstrip()
            else:
                # Last resort: hard break
                chunks.append(text[:max_length-3] + '...')
                text = text[max_length-3:].lstrip()
    
    return chunks

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
    
    # Join paragraphs with double newlines
    full_text = '\n\n'.join(paragraphs)
    return split_text_into_chunks(full_text)

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
                chunks = process_text_content(current_text)
                for i, chunk in enumerate(chunks, 1):
                    passages.append({
                        "book": current_book,
                        "chapter": current_chapter,
                        "text": chunk,
                        "part": f"{i}/{len(chunks)}" if len(chunks) > 1 else None
                    })
            current_book = line
            current_text = []
            continue
        
        # Check for new chapter
        chapter_match = re.match(r'^CHAPTER [IVXLCDM]+$', line)
        if chapter_match:
            # Save previous passage if exists
            if current_text and current_book and current_chapter:
                chunks = process_text_content(current_text)
                for i, chunk in enumerate(chunks, 1):
                    passages.append({
                        "book": current_book,
                        "chapter": current_chapter,
                        "text": chunk,
                        "part": f"{i}/{len(chunks)}" if len(chunks) > 1 else None
                    })
            current_chapter = line
            current_text = []
            continue
        
        # Add line to current text if we have both book and chapter
        if current_book and current_chapter:
            current_text.append(line)
    
    # Add final passage if exists
    if current_text and current_book and current_chapter:
        chunks = process_text_content(current_text)
        for i, chunk in enumerate(chunks, 1):
            passages.append({
                "book": current_book,
                "chapter": current_chapter,
                "text": chunk,
                "part": f"{i}/{len(chunks)}" if len(chunks) > 1 else None
            })
    
    # Save to JSON
    with open('thucydides.json', 'w', encoding='utf-8') as json_file:
        json.dump(passages, json_file, indent=2, ensure_ascii=False)
    
    print(f"Processing complete! Saved {len(passages)} passages to thucydides.json")

if __name__ == "__main__":
    process_thucydides("thucydides.txt")