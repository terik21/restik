import os
from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)

# Фиксируем путь к базе данных в папке backend/instance/
BASE_DIR = os.path.abspath(os.path.dirname(__file__))  
DB_PATH = os.path.join(BASE_DIR, "instance", "database.db")  
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'

app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Инициализация базы данных
db = SQLAlchemy(app)

# Модель пользователя
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    position = db.Column(db.String(100), nullable=False)
    fullname = db.Column(db.String(200), nullable=False)
    worker_code = db.Column(db.String(4), unique=True, nullable=False)
    admin_code = db.Column(db.String(4), nullable=False)

# Создание базы данных (если её нет)
with app.app_context():
    db.create_all()

# Маршрут для получения списка пользователей
@app.route("/users", methods=["GET"])
def get_users():
    users = User.query.all()
    return jsonify([{"id": u.id, "position": u.position, "fullname": u.fullname} for u in users])

# Маршрут для добавления нового пользователя
@app.route("/add_user", methods=["POST"])
def add_user():
    data = request.json
    if not all(key in data for key in ("position", "fullname", "worker_code", "admin_code")):
        return jsonify({"error": "Missing data"}), 400

    new_user = User(
        position=data["position"],
        fullname=data["fullname"],
        worker_code=data["worker_code"],
        admin_code=data["admin_code"]
    )
    db.session.add(new_user)
    db.session.commit()
    return jsonify({"message": "User added successfully"}), 201

# Запуск сервера
if __name__ == "__main__":
    app.run(debug=True)
