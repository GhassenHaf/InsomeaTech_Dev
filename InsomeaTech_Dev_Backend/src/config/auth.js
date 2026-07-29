const passport = require('passport');
const OIDCStrategy = require('passport-azure-ad').OIDCStrategy;
const User = require('../models/user');
const e = require('express');
const { logger } = require('@azure/storage-blob');

const azureStrategy = new OIDCStrategy(
    {
        identityMetadata: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/.well-known/openid-configuration`,
        clientID: process.env.AZURE_CLIENT_ID,
        clientSecret: process.env.AZURE_CLIENT_SECRET,
        redirectUrl: process.env.AZURE_CALLBACK_URL,
        responseType: 'code',
        responseMode: process.env.NODE_ENV === 'development' ? 'query' : 'form_post',
        scope: ['openid', 'profile', 'email'],
        allowHttpForRedirectUrl: process.env.NODE_ENV === 'development',
        passReqToCallback: false,
    },
    async (iss, sub, profile, accessToken, refreshToken, done) => {
        try {
            let email = profile.upn;
            let user = await User.findByEmail(email);

            let role = 'Sales'; // Default role
            if (profile._json && profile._json.roles) {
                try {
                    const roles = JSON.parse(profile._json.roles);
                    if (Array.isArray(roles) && roles.length > 0) {
                        role = roles[0];
                    }
                } catch (e) {
                    console.error('Error parsing roles from profile', e);
                }
            }

            if (user) {
                if (user.status === 'Inactive') {
                    console.log('Login attempt by inactive user:', user.email);
                    return done(null, false, { message: 'User is inactive' });
                }

                user = await User.update(user.id, {
                    email: email,
                    name: profile.displayName || profile.name.givenName + ' ' + profile.familyName,
                    role: role, // Keep existing role
                    status: user.status
                });
            } else {
                // Default status is 'Inactive' for new users, unless it's the specific admin email
                const status = (process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL) ? 'Active' : 'Inactive';
                
                user = await User.create({
                    email: email,
                    name: profile.displayName || profile.name.givenName + ' ' + profile.familyName,
                    role: role, // Default role for new users
                    status: status
                });

                if (user.status === 'Inactive') {
                    console.log('New user created but inactive:', user.email);
                    return done(null, false, { message: 'User is inactive' });
                }
            }
            
            console.log('User authenticated:', user.email); // Debug log
            return done(null, user);
        } catch (error) {
            console.error('Authentication error:', error); // Debug log
            return done(error, null);
        }
    }
);

// Serialize user for session
passport.serializeUser((user, done) => {
    console.log('Serializing user:', user.id); // Debug log
    done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
    try {
        console.log('Deserializing user:', id); // Debug log
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        console.error('Deserialize error:', error); // Debug log
        done(error, null);
    }
});

passport.use(azureStrategy);

module.exports = passport;