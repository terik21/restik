window.addEventListener('DOMContentLoaded', () => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (isLoggedIn !== 'true') {
        // Если не логинился — вернём на страницу входа
        window.location.href = "index.html";
    } else {
        // Можем показать имя пользователя, например
        const username = localStorage.getItem('username');
        document.querySelector('.sidebar p').textContent = `Пользователь: ${username}`;
    }
});

// Logout кнопка (если нужно)
document.querySelector('.sidebar button:nth-child(4)').addEventListener('click', () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('username');
    window.location.href = "index.html";
});
