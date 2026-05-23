import passport from "passport";
import { Strategy as GoogleStrategy, Profile, VerifyCallback } from "passport-google-oauth20";
import {prisma} from "../db";


const passportConfig = () => {
  passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      callbackURL: "/auth/google/callback",
      scope: ["profile", "email"],
      state: true,
    },
    async (
      accessToken: string,
      refreshToken: string,
      profile: Profile,
      cb: VerifyCallback
    ) => {
      try {
        // Using a transaction as per your original logic
        const user = await prisma.$transaction(async (tx) => {
          const existingUser = await tx.user.findUnique({
            where: { googleId: profile.id },
          });

          if (existingUser) {
            return existingUser;
          }

          return await tx.user.create({
            data: {
              name: profile.displayName,
              googleId: profile.id,
              email: profile.emails?.[0].value || "",
            },
          });
        });

        return cb(null, user);
      } catch (error) {
        return cb(error as Error);
      }
    }
  )
);


passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
    });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
})

};

export default passportConfig;