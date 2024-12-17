import json

def test_formatting():
    # Read the JSON file
    with open('thucydides.json', 'r', encoding='utf-8') as f:
        passages = json.load(f)
    
    # Print the first passage as a sample
    first_passage = passages[0]
    print("Book:", first_passage['book'])
    print("Chapter:", first_passage['chapter'])
    print("\nText:")
    print(first_passage['text'])
    
    # Print some basic stats
    print("\n---Stats---")
    print(f"Total passages: {len(passages)}")
    print(f"Average passage length: {sum(len(p['text']) for p in passages) // len(passages)} characters")

if __name__ == "__main__":
    test_formatting()