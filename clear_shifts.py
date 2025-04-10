import sqlite3

def connect_db():
    return sqlite3.connect("database.db", check_same_thread=False)

def clear_shifts():
    with connect_db() as db:
        cursor = db.cursor()
        cursor.execute("DELETE FROM shifts")
        db.commit()
        print("Все записи о сменах успешно удалены")

if __name__ == '__main__':
    clear_shifts()
