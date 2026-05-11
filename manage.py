import subprocess
import sys
import os

def update_blog():
    print("--- 📝 記事一覧を更新しますわ！ ---")
    script_path = os.path.join('tools', 'generate_posts.py')
    
    if not os.path.exists(script_path):
        print(f"エラー：{script_path} が見当たりませんわ...")
        return

    try:
        # generate_posts.py を実行
        result = subprocess.run([sys.executable, script_path], capture_output=True, text=True, encoding='utf-8')
        print(result.stdout)
        if result.stderr:
            print("警告（エラー）:", result.stderr)
        
        print("--- ✨ 更新が完了いたしました！内容を確認してプッシュしてくださいませ。 ---")
    except Exception as e:
        print(f"予期せぬエラーですわ：{e}")

def show_help():
    print("""
🎓 chikennokura 管理コンソール
usage: python manage.py <command>

commands:
  update  : blog/posts/*.md をスキャンして posts.json を更新します（ワンクッション！）
  help    : このヘルプを表示します
    """)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        show_help()
    else:
        command = sys.argv[1]
        if command == "update":
            update_blog()
        else:
            print(f"未知のコマンドですわ：{command}")
            show_help()
