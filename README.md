# 🗞️ Filledears - News & Blog Platform

A full-stack news aggregation and blog platform with user authentication, interactive features, and admin capabilities.

## ✨ Features

- **User Authentication** - Secure registration & login with JWT
- **News Feed** - Browse news articles by category
- **Interactive Features** - Like, comment, and share articles
- **User Profiles** - Custom profiles with avatars and streaks
- **Admin Panel** - Create and manage news articles
- **Dark/Light Theme** - Theme toggle for comfortable viewing
- **Responsive Design** - Works on desktop, tablet, and mobile

## 🛠️ Tech Stack

**Backend:**
- Node.js + Express.js
- MySQL Database
- JWT Authentication
- bcryptjs for password hashing

**Frontend:**
- HTML5 / CSS3 / JavaScript
- Responsive design
- Real-time updates

## 📋 Prerequisites

- Node.js (v14+)
- MySQL (v5.7+)
- npm or yarn

## 🚀 Local Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Database
```bash
mysql -u root -p < schema.sql
```

### 3. Configure Environment
Copy `filledears.env.example` to `.env` and update:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=filledears
PORT=3000
JWT_SECRET=your_secret_key_here
```

### 4. Start the Server
```bash
npm start
```

Server runs on **http://localhost:3000**

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)

### News
- `GET /api/news` - Get all news articles
- `GET /api/news/:id` - Get single article
- `POST /api/news` - Create article (admin only)

### Interactions
- `POST /api/news/:id/like` - Toggle like
- `POST /api/news/:id/comments` - Add comment
- `GET /api/news/:id/comments` - Get comments

### Stats
- `GET /api/stats` - Get platform statistics

## 🔐 Demo Credentials

```
Email: th881384@gmail.com
Password: admin123
```

## 🚢 Deployment

### Railway (Backend + MySQL)
1. Push to GitHub
2. Connect Railway to GitHub repo
3. Add MySQL plugin
4. Set environment variables
5. Deploy

### Vercel (Frontend)
1. Import GitHub repo to Vercel
2. Update API URLs in `public/index.html`
3. Deploy

## 📁 Project Structure

```
filledears/
├── server.js              # Main Express server
├── schema.sql             # Database schema
├── package.json           # Dependencies
├── .env.example           # Environment template
├── public/
│   └── index.html         # Frontend application
├── vercel.json            # Vercel config
├── railway.json           # Railway config
└── Procfile              # Process file for deployment
```

## 🤝 Contributing

Feel free to submit issues and enhancement requests!

## 📝 License

MIT License - feel free to use for personal or commercial projects.

## 📞 Support

For issues or questions, please open an issue in the repository.

---

**Happy coding! 🚀**
