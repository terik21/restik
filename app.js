document.getElementById('login-btn').addEventListener('click', login);

function login() {
    const username = document.getElementById('username').value.trim();
    const code = document.getElementById('code').value.trim();

    // Простейшая проверка
    if (username === "admin" && code === "1234") {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
    } else {
        alert('Неверный логин или код');
    }
}
