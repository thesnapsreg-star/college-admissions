#!/bin/bash

# College Admissions Application Setup Script
# This script installs dependencies and starts the development servers

set -e

echo "🎓 College Admissions Application Setup"
echo "========================================="

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Install server dependencies
echo ""
echo "📦 Installing server dependencies..."
cd server
npm install
cd ..

# Install client dependencies
echo ""
echo "📦 Installing client dependencies..."
cd client
npm install
cd ..

# Create environment file if not exists
if [ ! -f .env ]; then
    echo ""
    echo "📝 Creating .env file..."
    cat > .env << EOF
# College Admissions App Environment Variables
JWT_SECRET=change-this-secret-in-production
EOF
fi

echo ""
echo "✅ Installation complete!"
echo ""
echo "🚀 To start the servers:"
echo "   Terminal 1 - Backend:  cd server && npm run dev"
echo "   Terminal 2 - Frontend: cd client && npm run dev"
echo ""
echo "📱 Access the application:"
echo "   Frontend: http://localhost:4006"
echo "   Backend:  http://localhost:4007"
echo ""
echo "🔑 Demo credentials:"
echo "   Admin:     admin@college.edu / admin123"
echo "   Officer:   officer@college.edu / officer123"
echo "   Applicant: student@email.com / student123"
