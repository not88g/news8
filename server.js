const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve images and raw articles statically
// This allows the WP8.1 app to download images via /images/DDMMYY-HHMM.png
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/articles', express.static(path.join(__dirname, 'articles')));

// API endpoint to get all news items combined
app.get('/api/news', (req, res) => {
    const articlesDir = path.join(__dirname, 'articles');
    
    // Check if directory exists
    if (!fs.existsSync(articlesDir)) {
        return res.status(200).json([]); // Return empty array if no articles yet
    }

    fs.readdir(articlesDir, (err, files) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read articles directory' });
        }

        // Filter only .json files
        const jsonFiles = files.filter(f => f.endsWith('.json'));
        const newsList = [];

        jsonFiles.forEach(file => {
            const filePath = path.join(articlesDir, file);
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                const article = JSON.parse(content);
                
                // Extract the base name (e.g., "230226-0912")
                const baseName = path.basename(file, '.json');
                article.Id = baseName;
                
                // Automatically assign an image URL based on the filename if one isn't provided
                if (!article.ImageUrl) {
                    // This creates a relative URL. 
                    // The Windows Phone app will append this to your Render server's base URL.
                    article.ImageUrl = `/images/${baseName}.png`; 
                }

                newsList.push(article);
            } catch (e) {
                console.error(`Error reading or parsing ${file}:`, e);
            }
        });

        // Sort the articles newest to oldest based on the DDMMYY-HHMM filename
        newsList.sort((a, b) => {
            const parseDate = (id) => {
                if (!id || id.length < 11) return 0;
                // Parse DDMMYY-HHMM
                const D = id.substring(0, 2);
                const M = id.substring(2, 4);
                const Y = id.substring(4, 6);
                const h = id.substring(7, 9);
                const m = id.substring(9, 11);
                
                // Construct a comparable Date object (assuming 20XX for the year)
                return new Date(`20${Y}-${M}-${D}T${h}:${m}:00Z`).getTime();
            };
            
            return parseDate(b.Id) - parseDate(a.Id); // Descending order
        });

        // Send the compiled and sorted list to the client
        res.json(newsList);
    });
});

app.listen(PORT, () => {
    console.log(`News8 Server is running on port ${PORT}`);
});
