document.getElementById('login-btn').addEventListener('click', () => {
    const username = document.getElementById('username').value.trim();
    const code = document.getElementById('code').value.trim();

    if (username === "admin" && code === "1234") {
        // Сохраняем флаг успешного входа
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('username', username);
        window.location.href = "dashboard.html";
    } else {
        alert('Неверный логин или код');
    }
});
