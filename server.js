const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000; // Render default port

app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/articles', express.static(path.join(__dirname, 'articles')));

app.get('/api/news', (req, res) => {
    const articlesDir = path.join(__dirname, 'articles');
    
    if (!fs.existsSync(articlesDir)) return res.json([]);

    fs.readdir(articlesDir, (err, files) => {
        if (err) return res.status(500).json({ error: 'Read error' });

        const jsonFiles = files.filter(f => f.endsWith('.json'));
        const newsList = [];

        jsonFiles.forEach(file => {
            try {
                const content = fs.readFileSync(path.join(articlesDir, file), 'utf8');
                const article = JSON.parse(content);
                const baseName = path.basename(file, '.json');
                
                article.Id = baseName;
                // Full URL for the WP8.1 app (Render URL)
                const baseUrl = "https://news8.onrender.com";
                article.ImageUrl = `${baseUrl}/images/${baseName}.png`;

                newsList.push(article);
            } catch (e) { console.error(e); }
        });

        // Sort DDMMYYYY-HHMM (Newest first)
        newsList.sort((a, b) => {
            const parseId = (id) => {
                if (!id || id.length < 13) return 0;
                const d = id.substring(0, 2), m = id.substring(2, 4), y = id.substring(4, 8);
                const hr = id.substring(9, 11), min = id.substring(11, 13);
                return new Date(`${y}-${m}-${d}T${hr}:${min}:00Z`).getTime();
            };
            return parseId(b.Id) - parseId(a.Id);
        });

        res.json(newsList);
    });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
