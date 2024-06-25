<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mon Site Web</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <header>
        <h1>Bienvenue sur mon site web</h1>
        <nav>
            <ul>
                <li><a href="#home">Accueil</a></li>
                <li><a href="#about">À propos</a></li>
                <li><a href="#contact">Contact</a></li>
            </ul>
        </nav>
    </header>
    <main>
        <section id="home">
            <h2>Accueil</h2>
            <p>Ceci est la page d'accueil de mon site web.</p>
        </section>
        <section id="about">
            <h2>À propos</h2>
            <p>Informations à propos de moi.</p>
        </section>
        <section id="contact">
            <h2>Contact</h2>
            <p>Me contacter à travers ce formulaire.</p>
            <form>
                <label for="name">Nom:</label>
                <input type="text" id="name" name="name" required>
                <label for="email">Email:</label>
                <input type="email" id="email" name="email" required>
                <label for="message">Message:</label>
                <textarea id="message" name="message" required></textarea>
                <button type="submit">Envoyer</button>
            </form>
        </section>
    </main>
    <footer>
        <p>&copy; 2024 Mon Site Web</p>
    </footer>
    <script src="script.js"></script>
</body>
</html>
