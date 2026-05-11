import os
import json
import re

def parse_front_matter(content):
    # Front Matter を抽出する正規表現
    match = re.match(r'^---\r?\n([\s\S]+?)\r?\n---', content)
    if not match:
        return None
    
    metadata = {}
    yaml_text = match.group(1)
    for line in yaml_text.split('\n'):
        if ':' in line:
            key, value = line.split(':', 1)
            # キーと値をトリミングし、値の中の余分な空白や改行を消去
            metadata[key.strip()] = value.strip()
    return metadata

def main():
    posts = []
    # スクリプトの実行場所に関わらず正しいパスを指定
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    posts_dir = os.path.join(base_dir, 'blog', 'posts')
    output_file = os.path.join(base_dir, 'blog', 'posts.json')

    print(f"Scanning directory: {posts_dir}")

    if not os.path.exists(posts_dir):
        print(f"Error: {posts_dir} does not exist.")
        return

    for filename in os.listdir(posts_dir):
        if filename.endswith('.md'):
            filepath = os.path.join(posts_dir, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                    meta = parse_front_matter(content)
                    if meta:
                        meta['id'] = filename.replace('.md', '')
                        posts.append(meta)
                        print(f"Found: {filename}")
                    else:
                        print(f"Warning: No Front Matter in {filename}")
            except Exception as e:
                print(f"Error reading {filename}: {e}")

    # 日付の降順（新しい順）にソート
    posts.sort(key=lambda x: x.get('date', ''), reverse=True)

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(posts, f, ensure_ascii=False, indent=2)

    print(f"Success! Generated {output_file} with {len(posts)} articles.")

if __name__ == "__main__":
    main()
