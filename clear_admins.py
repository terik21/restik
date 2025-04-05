import sqlite3

def connect_db():
    return sqlite3.connect("database.db", check_same_thread=False)

def clear_admins():
    with connect_db() as db:
        cursor = db.cursor()
        cursor.execute("""
            DELETE FROM users 
            WHERE position = 'Администратор' 
            AND fullname != 'Тараканов'
        """)
        rows_deleted = cursor.rowcount
        db.commit()
        print(f"Удалено администраторов: {rows_deleted}")

if __name__ == '__main__':
    clear_admins()