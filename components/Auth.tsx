import React, { useState } from 'react';
import { VoicemintLogo, WarningIcon } from './icons';
import type { User } from '../types';

interface AuthProps {
    onAuthSuccess: (user: User) => void;
}

export const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        setError(null);
        if (!email.trim() || !password.trim()) {
            setError("Email and password cannot be empty.");
            return;
        }

        try {
            const usersJSON = localStorage.getItem('voicemint_users');
            const users: User[] = usersJSON ? JSON.parse(usersJSON) : [];

            if (isLogin) {
                // Handle Login
                const user = users.find(u => u.email === email);
                // Note: In a real app, passwords would be hashed and compared securely.
                // For this simulation, we are comparing plain text passwords.
                if (user && (user as any).password === password) {
                    onAuthSuccess({ email: user.email });
                } else {
                    setError("Invalid email or password.");
                }
            } else {
                // Handle Sign Up
                const userExists = users.some(u => u.email === email);
                if (userExists) {
                    setError("An account with this email already exists.");
                } else {
                    const newUser = { email, password };
                    users.push(newUser);
                    localStorage.setItem('voicemint_users', JSON.stringify(users));
                    onAuthSuccess({ email: newUser.email });
                }
            }
        } catch (e) {
            console.error("Auth error:", e);
            setError("An unexpected error occurred. Please try again.");
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 font-sans text-gray-200 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md">
                <header className="text-center mb-8">
                    <div className="flex items-center justify-center gap-3">
                        <VoicemintLogo className="w-12 h-12 sm:w-14 sm:h-14" />
                        <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
                            Voicemint
                        </h1>
                    </div>
                    <p className="text-gray-400 mt-2 text-lg">
                        {isLogin ? 'Welcome back! Please log in.' : 'Create an account to get started.'}
                    </p>
                </header>

                <div className="bg-gray-800/50 p-8 rounded-2xl shadow-lg border border-gray-700">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                                Email Address
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-shadow appearance-none text-gray-200"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-shadow appearance-none text-gray-200"
                            />
                        </div>
                        
                        {error && (
                            <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-2 rounded-lg flex items-start gap-2 text-sm" role="alert">
                                <WarningIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div>
                            <button
                                type="submit"
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-full shadow-sm text-md font-semibold text-white bg-gradient-to-r from-purple-500 to-pink-500 hover:shadow-purple-500/50 transform hover:scale-105 transition-all duration-300"
                            >
                                {isLogin ? 'Log In' : 'Sign Up'}
                            </button>
                        </div>
                    </form>

                    <p className="mt-6 text-center text-sm text-gray-400">
                        {isLogin ? "Don't have an account? " : "Already have an account? "}
                        <button
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setError(null);
                            }}
                            className="font-semibold text-purple-400 hover:text-purple-300"
                        >
                            {isLogin ? 'Sign Up' : 'Log In'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};
