#!/bin/bash

# نص تشغيل النظام
echo "🚀 بدء تشغيل نظام واتساب ميتا المتكامل..."

# التحقق من وجود Node.js
if ! command -v node &> /dev/null; then
    echo "❌ خطأ: Node.js غير مثبت. يرجى تثبيت Node.js أولاً."
    exit 1
fi

# التحقق من وجود npm
if ! command -v npm &> /dev/null; then
    echo "❌ خطأ: npm غير مثبت. يرجى تثبيت npm أولاً."
    exit 1
fi

# التحقق من وجود node_modules
if [ ! -d "node_modules" ]; then
    echo "📦 تثبيت التبعيات..."
    npm install
fi

# تشغيل الخادم
echo "🌐 تشغيل الخادم على المنفذ 3000..."
echo "🔗 افتح المتصفح على: http://localhost:3000"
echo "👤 بيانات الدخول الافتراضية:"
echo "   اسم المستخدم: admin"
echo "   كلمة المرور: password"
echo ""
echo "اضغط Ctrl+C لإيقاف الخادم"
echo "============================================"

npm start