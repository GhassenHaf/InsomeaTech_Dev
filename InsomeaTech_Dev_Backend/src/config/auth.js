const passport = require('passport');
const OIDCStrategy = require('passport-azure-ad').OIDCStrategy;
const User = require('../models/user');

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
        useCookieInsteadOfSession: false,
        passReqToCallback: false,
    },
    async (iss, sub, profile, accessToken, refreshToken, done) => {
        try {
            const email = profile.upn || (profile._json && profile._json.preferred_username) || profile.oid;
            if (!email) {
                return done(new Error('No valid email or user principal returned from Azure AD'), null);
            }

            let user = await User.findByEmail(email);

            // Parse roles safely whether returned as a string array or JSON string
            let role = 'Sales';
            if (profile._json && profile._json.roles) {
                try {
                    const roles = typeof profile._json.roles === 'string'
                        ? JSON.parse(profile._json.roles)
                        : profile._json.roles;
                    if (Array.isArray(roles) && roles.length > 0) {
                        role = roles[0];
                    }
                } catch (e) {
                    console.error('Error parsing roles from profile:', e);
                }
            }

            // Construct display name safely without throwing if profile.name is undefined
            const displayName = profile.displayName ||
                (profile.name ? `${profile.name.givenName || ''} ${profile.familyName || ''}`.trim() : '') ||
                email;

            if (user) {
                if (user.status === 'Inactive') {
                    console.log('Login attempt by inactive user:', user.email);
                    return done(null, false, { message: 'User is inactive' });
                }

                user = await User.update(user.id, {
                    email: email,
                    name: displayName,
                    role: role,
                    status: user.status
                });
            } else {
                const status = (process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL) ? 'Active' : 'Inactive';

                user = await User.create({
                    email: email,
                    name: displayName,
                    role: role,
                    status: status
                });

                if (user.status === 'Inactive') {
                    console.log('New user created but inactive:', user.email);
                    return done(null, false, { message: 'User is inactive' });
                }
            }

            console.log('User authenticated successfully:', user.email);
            return done(null, user);
        } catch (error) {
            console.error('Authentication strategy error:', error);
            return done(error, null);
        }
    }
);

passport.serializeUser((user, done) => {
    console.log('Serializing user:', user.id);
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        console.log('Deserializing user:', id);
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        console.error('Deserialize error:', error);
        done(error, null);
    }
});

passport.use(azureStrategy);

module.exports = passport;
