from flask import Flask, request, jsonify
import sqlite3
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:8000"}})  # Разрешает запросы с фронта

def connect_db():
    return sqlite3.connect("database.db", check_same_thread=False)

# Создание таблицы пользователей
with connect_db() as db:
    db.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        position TEXT,
        fullname TEXT,
        worker_code TEXT,
        admin_code TEXT
    )''')
    db.commit()

# Регистрация пользователя
@app.route('/register', methods=['POST'])
def register():
    data = request.json

    required_fields = ["position", "fullname", "worker_code", "admin_code"]
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Отсутствуют необходимые поля"}), 400

    position = data["position"]
    fullname = data["fullname"]
    worker_code = data["worker_code"]
    admin_code = data["admin_code"]

    if admin_code != '4321':
        return jsonify({"error": "Неверный код админа"}), 403

    with connect_db() as db:
        cursor = db.cursor()
        cursor.execute("INSERT INTO users (position, fullname, worker_code, admin_code) VALUES (?, ?, ?, ?)",
                       (position, fullname, worker_code, admin_code))
        db.commit()

    return jsonify({"message": "Пользователь зарегистрирован"}), 201

# Вход (проверка логина и пароля)
@app.route('/login', methods=['POST'])
def login():
    data = request.json

    if "fullname" not in data or "worker_code" not in data:
        return jsonify({"error": "Отсутствуют fullname или worker_code"}), 400

    fullname = data["fullname"]
    worker_code = data["worker_code"]

    with connect_db() as db:
        cursor = db.cursor()
        cursor.execute("SELECT id, position, fullname FROM users WHERE fullname = ? AND worker_code = ?", (fullname, worker_code))
        user = cursor.fetchone()

    if not user:
        return jsonify({"error": "Неверные данные"}), 401

    return jsonify({
        "message": "Вход выполнен",
        "user": {
            "id": user[0],
            "position": user[1],
            "fullname": user[2]
        }
    }), 200

# Получение списка пользователей
@app.route('/users', methods=['GET'])
def get_users():
    with connect_db() as db:
        cursor = db.cursor()
        cursor.execute("SELECT id, position, fullname FROM users")
        users = cursor.fetchall()

    return jsonify(users), 200

# Редактирование пользователя
@app.route('/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    data = request.json

    with connect_db() as db:
        cursor = db.cursor()
        cursor.execute("UPDATE users SET position = ?, fullname = ?, worker_code = ? WHERE id = ?",
                       (data.get("position"), data.get("fullname"), data.get("worker_code"), user_id))
        db.commit()

    return jsonify({"message": "Пользователь обновлен"}), 200

# Удаление пользователя
@app.route('/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    with connect_db() as db:
        cursor = db.cursor()
        cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
        db.commit()

    return jsonify({"message": "Пользователь удален"}), 200

if __name__ == '__main__':
    app.run(debug=True, port=5001)
