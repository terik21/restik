from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    position = db.Column(db.String(100), nullable=False)
    fullname = db.Column(db.String(200), nullable=False)
    worker_code = db.Column(db.String(4), unique=True, nullable=False)
    admin_code = db.Column(db.String(4), nullable=False)
