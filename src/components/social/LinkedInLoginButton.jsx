// // LinkedInLoginButton.jsx
// import React from 'react';
// import { useNavigate } from 'react-router-dom';

// const LinkedInLoginButton = () => {
//     const navigate = useNavigate();

//     const handleLinkedInLogin = () => {
//         const clientId = '78qgsmwhqp5elv';
//         const redirectUri = 'http://localhost:5173/auth/linkedin/callback';
//         const encodedRedirectUri = encodeURIComponent(redirectUri);
//         const scope = encodeURIComponent('openid profile email');
//         const state = Math.random().toString(36).substring(2, 15);
        
//         localStorage.setItem('linkedin_oauth_state', state);
        
//         const linkedInAuthUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodedRedirectUri}&scope=${scope}&state=${state}`;
        
//         console.log('🔗 LinkedIn Auth URL:', linkedInAuthUrl);
//         window.location.href = linkedInAuthUrl;
//     };

//     return (
//         <button
//             onClick={handleLinkedInLogin}
//             style={{
//                 display: 'flex',
//                 alignItems: 'center',
//                 justifyContent: 'center',
//                 gap: '12px',
//                 padding: '14px 28px',
//                 backgroundColor: '#0077B5',
//                 color: 'white',
//                 border: 'none',
//                 borderRadius: '8px',
//                 fontSize: '16px',
//                 fontWeight: '600',
//                 cursor: 'pointer',
//                 width: '100%',
//                 maxWidth: '350px',
//                 margin: '15px 0',
//                 transition: 'all 0.3s ease'
//             }}
//         >
//             <div style={{
//                 width: '24px',
//                 height: '24px',
//                 display: 'flex',
//                 alignItems: 'center',
//                 justifyContent: 'center',
//                 background: 'white',
//                 borderRadius: '4px',
//                 padding: '2px'
//             }}>
//                 <svg width="20" height="20" viewBox="0 0 24 24">
//                     <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" fill="#0077B5"/>
//                 </svg>
//             </div>
//             <span>Continue with LinkedIn</span>
//         </button>
//     );
// };

// // ✅ ये LINE जरूरी है
// export default LinkedInLoginButton;




import React from 'react';
import { useNavigate } from 'react-router-dom';

const LinkedInLoginButton = () => {
    const navigate = useNavigate();

    const handleLinkedInLogin = async () => {
        try {
            // ✅ Fetch Auth URL from Backend (Prevents hardcoded Client ID issues)
            const backendUrl = import.meta.env.VITE_API_BASE_URL || 'https://backend-q0wc.onrender.com';
            const response = await fetch(`${backendUrl}/api/linkedin/auth-url`);
            const data = await response.json();

            if (data.url) {
                console.log('🔗 Redirecting to LinkedIn:', data.url);
                window.location.href = data.url;
            } else {
                throw new Error('Failed to get LinkedIn Auth URL');
            }
        } catch (error) {
            console.error('❌ LinkedIn Login Error:', error);
            alert('Failed to initiate LinkedIn login. Please try again.');
        }
    };

    return (
        <button
            onClick={handleLinkedInLogin}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                padding: '14px 28px',
                backgroundColor: '#0077B5',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                width: '100%',
                maxWidth: '350px',
                margin: '15px 0',
                transition: 'all 0.3s ease'
            }}
        >
            <div style={{
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'white',
                borderRadius: '4px',
                padding: '2px'
            }}>
                <svg width="20" height="20" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" fill="#0077B5"/>
                </svg>
            </div>
            <span>Continue with LinkedIn</span>
        </button>
    );
};

// ✅ ये LINE जरूरी है
export default LinkedInLoginButton;


// import React from 'react';

// const LinkedInLoginButton = () => {
//     const handleLinkedInLogin = () => {
//         const clientId = '78qqsmwhpq5elv';
//         const redirectUri = 'http://localhost:5173/auth/linkedin/callback'; // Aapka exact Redirect URI
//         const scope = 'openid profile email';
//         const state = Math.random().toString(36).substring(2, 15);
        
//         // Security ke liye state save karein
//         localStorage.setItem('linkedin_oauth_state', state);
        
//         const linkedInAuthUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}`;
        
//         window.location.href = linkedInAuthUrl;
//     };

//     return (
//         <button onClick={handleLinkedInLogin} style={buttonStyle}>
//             <LinkedInIcon />
//             <span>Continue with LinkedIn</span>
//         </button>
//     );
// };

// // Simple Styles
// const buttonStyle = {
//     display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
//     padding: '12px 24px', backgroundColor: '#0077B5', color: 'white',
//     border: 'none', borderRadius: '8px', cursor: 'pointer', width: '100%'
// };

// const LinkedInIcon = () => (
//     <svg width="20" height="20" fill="white" viewBox="0 0 24 24">
//         <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
//     </svg>
// );

// export default LinkedInLoginButton;

















// // // LinkedInLoginButton.jsx
// // import React from 'react';
// // import { useNavigate } from 'react-router-dom';

// // const LinkedInLoginButton = () => {
// //     const navigate = useNavigate();

// //     const handleLinkedInLogin = () => {
// //         // LinkedIn OAuth Configuration
// //         const clientId = '78qqsmwhpq5elv'; // Your LinkedIn Client ID
        
// //         // ✅ ये exact वही URL होना चाहिए जो LinkedIn Developer App में registered है
// //         const redirectUri = 'http://localhost:5173/auth/linkedin/callback';
        
// //         // Encode करें
// //         const encodedRedirectUri = encodeURIComponent(redirectUri);
// //         const scope = encodeURIComponent('openid profile email');
        
// //         // Random state generate करें (security के लिए)
// //         const state = Math.random().toString(36).substring(2, 15);
// //         localStorage.setItem('linkedin_oauth_state', state);
        
// //         // ✅ LinkedIn OAuth URL बनाएं
// //         const linkedInAuthUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodedRedirectUri}&scope=${scope}&state=${state}`;
        
// //         console.log('🔗 LinkedIn Auth URL:', linkedInAuthUrl);
// //         console.log('✅ Redirect URI:', redirectUri);
        
// //         // User को LinkedIn login page पर redirect करें
// //         window.location.href = linkedInAuthUrl;
// //     };

// //     return (
// //         <button
// //             onClick={handleLinkedInLogin}
// //             style={{
// //                 display: 'flex',
// //                 alignItems: 'center',
// //                 justifyContent: 'center',
// //                 gap: '12px',
// //                 padding: '14px 28px',
// //                 backgroundColor: '#0077B5',
// //                 color: 'white',
// //                 border: 'none',
// //                 borderRadius: '8px',
// //                 fontSize: '16px',
// //                 fontWeight: '600',
// //                 cursor: 'pointer',
// //                 width: '100%',
// //                 maxWidth: '350px',
// //                 margin: '15px 0',
// //                 transition: 'all 0.3s ease',
// //                 boxShadow: '0 4px 6px rgba(0, 119, 181, 0.2)'
// //             }}
// //             onMouseOver={(e) => {
// //                 e.target.style.backgroundColor = '#006699';
// //                 e.target.style.transform = 'translateY(-2px)';
// //                 e.target.style.boxShadow = '0 6px 8px rgba(0, 119, 181, 0.3)';
// //             }}
// //             onMouseOut={(e) => {
// //                 e.target.style.backgroundColor = '#0077B5';
// //                 e.target.style.transform = 'translateY(0)';
// //                 e.target.style.boxShadow = '0 4px 6px rgba(0, 119, 181, 0.2)';
// //             }}
// //         >
// //             <div style={{
// //                 width: '24px',
// //                 height: '24px',
// //                 display: 'flex',
// //                 alignItems: 'center',
// //                 justifyContent: 'center',
// //                 background: 'white',
// //                 borderRadius: '4px',
// //                 padding: '2px'
// //             }}>
// //                 <svg width="20" height="20" viewBox="0 0 24 24">
// //                     <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" fill="#0077B5"/>
// //                 </svg>
// //             </div>
// //             <span>Continue with LinkedIn</span>
// //         </button>
// //     );
// // };

// // export default LinkedInLoginButton;