import json
import os

MAX_CHARACTERS = 824  # Farcaster character limit
PASSAGES_FILE = "thucydides.json"  # JSON file with all passages
PROGRESS_FILE = "progress.json"    # File to track progress

def load_passages(file_path):
    """Load the JSON file containing Thucydides passages."""
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)

def clip_text(text, max_length):
    """Clip the text to fit within max_length characters."""
    if len(text) <= max_length:
        return text
    clipped = text[:max_length].rsplit(" ", 1)[0]  # Avoid splitting words
    return f"{clipped}..."

def load_progress():
    """Load progress (index of the last passage shown)."""
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE, "r", encoding="utf-8") as f:
            return json.load(f).get("last_index", -1)
    return -1  # Default to start from the beginning

def save_progress(index):
    """Save progress (index of the last passage shown)."""
    with open(PROGRESS_FILE, "w", encoding="utf-8") as f:
        json.dump({"last_index": index}, f)

def display_passage(passage, index):
    """Format and display the clipped passage."""
    clipped_text = clip_text(passage['text'], MAX_CHARACTERS)
    print("\n📜 **Daily Thucydides Passage** 📜")
    print("-" * 40)
    print(f"{passage['book']} - {passage['chapter']} (Passage {index + 1})\n")
    print(clipped_text)
    print("-" * 40)

def main():
    passages = load_passages(PASSAGES_FILE)  # Load all passages
    last_index = load_progress()  # Get the last shown index

    # Determine the next passage index
    next_index = last_index + 1
    if next_index >= len(passages):  # Reset if we reach the end
        next_index = 0

    # Get the next passage
    passage = passages[next_index]
    display_passage(passage, next_index)

    # Save the progress
    save_progress(next_index)

if __name__ == "__main__":
    main()