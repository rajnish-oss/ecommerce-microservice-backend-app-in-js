import { PrismaClient } from "../generated/prisma/client";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { Resend } from "resend";
import express, { Request, Response } from "express";
import passport from "passport";
import { OAuth2Client, GoogleAuth } from "google-auth-library";
import passportConfig from "../infra/passport.config";
import fs from "fs";
import path from "path";


passportConfig();

const resend = new Resend(process.env.RESEND_API_KEY);

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_CALLBACK_URL || "http://localhost:8000/auth/google/callback"
);

function getPrivateKey() {
        const privateKey = fs.readFileSync('/run/secrets/my_private_key', 'utf8');

        if (!privateKey) {
                throw new Error("PRIVATE_KEY is not configured");
        }

        return privateKey;
}

export class UserService{
    constructor(private readonly prisma: PrismaClient){}

    async login(email: string, password: string){
        try {
            const user = await this.prisma.user.findUnique({
                where: { email: email }
            });

            if(!user){
                throw new Error("User not found");
            }

            const isPasswordValid = await bcrypt.compare(password, user.password || "");
        
            if (!isPasswordValid) {
                throw new Error("Invalid credentials");
            }

            const token = jwt.sign(
                { 
                    sub: user.id,
                    email: user.email,
                }, 
                getPrivateKey(), 
                { algorithm: 'RS256', expiresIn: '10h' }
            );

            if(!token){
                throw new Error("Failed to generate token");
            }

            return { accessToken: token };
        } catch (error: any) {
            throw new Error(`Login failed: ${error.message || error}`);
        }
    }

    async register(name: string, email: string, password: string){
        try {
            const existingUser = await this.prisma.user.findUnique({
                where: { email }
            });

            if(existingUser){
                throw new Error("User already exists");
            }

            const passwordHash = await bcrypt.hash(password, 10);

            await this.prisma.user.create({
                data: {
                    name,
                    email,
                    password: passwordHash,
                    isVerified: false
                }
            });

            return "Account created! Please log in.";
        } catch (error: any) {
            throw new Error(`Registration failed: ${error.message || error}`);
        }
    }

    async verifyEmail(userId: string) {
        try {
            const updatedUser = await this.prisma.user.update({
                where: { id: userId },
                data: {
                    isVerified: true
                }
            });

            const accessToken = jwt.sign(
                { 
                    sub: updatedUser.id, 
                    email: updatedUser.email,
                },
                getPrivateKey(),
                { algorithm: 'RS256', expiresIn: '15m' }
            );

            return {
                message: "Email verified! Logging you in...",
                accessToken: accessToken,
                user: {
                    id: updatedUser.id,
                    name: updatedUser.name
                }
            };
        } catch (error: any) {
            throw new Error(`Email verification failed: ${error.message || error}`);
        }
    }

    async forgotPassword(email: string) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { email }
            });

            if (!user) {
                throw new Error("User not found");
            }

            const token = jwt.sign(
                {
                    sub: user.id,
                    email: user.email
                },
                getPrivateKey(),
                { algorithm: 'RS256', expiresIn: '15m' }
            );

            if (!token) {
                throw new Error("Failed to generate token");
            }

            const resetUrl = `https://localhost:8080/reset-password?token=${token}`;

            await resend.emails.send({
            from: "Acme <onboarding@resend.dev>",
            to: [email],
            subject: "Reset your password",
            html: `<p>Click here to reset: <a href="${resetUrl}">Reset Link</a></p>`,
            });
        }catch (error: any) {
            throw new Error(`Password reset failed: ${error.message || error}`);
        }
    }

    async resetPassword(token: string, newPassword: string) {
        try {
            const payload = jwt.verify(token, getPrivateKey()) as any;
            const user = await this.prisma.user.findUnique({
                where: { id: payload.sub }
            });

            if (!user) {
                throw new Error("User not found");
            }

            const passwordHash = await bcrypt.hash(newPassword, 10);

            await this.prisma.user.update({
                where: { id: user.id },
                data: {
                    password: passwordHash
                }
            });
        } catch (error: any) {
            throw new Error(`Password reset failed: ${error.message || error}`);
        }
    }


    async googleCallback(code: string){
        try {
            const { tokens } = await googleClient.getToken(code);
            const idToken = tokens.id_token;

            if (!idToken) {
                throw new Error("Google did not return an id_token");
            }
            
            const ticket = await googleClient.verifyIdToken({
                idToken,
                audience: process.env.GOOGLE_CLIENT_ID,
            });

            const payload = ticket.getPayload();
            const googleId = payload?.sub;
            const email = payload?.email;
            const firstName = payload?.given_name || "";
            const lastName = payload?.family_name || "";

            if (!googleId || !email) {
                throw new Error("Unable to extract user info from Google token");
            }

            let user = await this.prisma.user.findUnique({
                where: { googleId },
            });

            if (!user) {
                user = await this.prisma.user.create({
                    data: {
                        name: `${firstName} ${lastName}`,
                        email: email,
                        googleId: googleId,
                        isVerified: true
                    },
                });
            }

            const accessToken = jwt.sign(
                { 
                    sub: user.id, 
                    email: user.email,
                },
                getPrivateKey(),
                { algorithm: 'RS256', expiresIn: '15m' }
            );

            return {
                accessToken: accessToken,
                user: {
                    id: user.id,
                    name: user.name
                }
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Google authentication failed: ${message}`);
        }
    }
}