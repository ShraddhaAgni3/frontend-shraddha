import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { UserProfileProvider } from "./components/context/UseProfileContext";
import Header from "./components/home/Header";
import Footer from "./components/home/Footer";

// Import your new AdminDashboard component (the one I just modified)
// import AdminDashboard from "./components/admin/AdminDashboard";
import AdminDashboard from "./components/admin/AdminPage";

// ... rest of your imports remain the same
import Login from "./components/pages/Login";
import Register from "./components/pages/Register";
import ForgotPassword from "./components/pages/ForgotPassword";
import Home from "./components/pages/Home";
import PaymentSuccess from "./components/pages/PaymentSuccess";
import PaymentFailed from "./components/pages/PaymentFailed";
import UserDashboard from "./components/dashboard/UserDashbord";
import UserCreateForm from "./components/profiles/CreateProfile";
import EditProfile from "./components/profiles/EditProfile";
import ProtectedRoute from "./components/admin/ProtectedRoute";
import AdminLogin from "./components/admin/AdminLogin";
import MatchesPage from "./components/MatchSystem/MatchesPage";
import MembersPage from "./components/pages/MemberPage";
import Contact from "./components/pages/Contact";
import UserPlans from "./components/pages/UserPlans";
import Cart from "./components/pages/cart";
import AdminAddNewPlan from "./components/pages/AdminAddNewPlan";
import BlogPage from "./components/pages/BlogPage";
import AdminBlog from "./components/pages/AdminBlog";
import CreateArticle from "./components/pages/CreateArticle";
import ArticleDetails from "./components/pages/ArticleDetails";
import EditArticle from "./components/pages/EditArticle";
import { ToastContainer } from "react-toastify";
import ProfileViews from "./components/pages/ProfileViews";
import About from "./components/pages/AboutPage";
import FallbackPage from "./components/pages/FallbackPage";
import FacebookPage from "./components/social/FacebookPage";
import LinkedInPage from "./components/social/LinkedinPage";
import TwitterPage from "./components/social/TwitterPage";
import PrivacyPolicy from "./components/social/PrivacyPolicy";
import Accessibility from "./components/social/Accessibility";
import Imprint from "./components/social/Imprint";
import OnlineDating from "./components/social/OnlineDating";
import TermsAndConditions from "./components/social/TermsAndConditions";
import Securety from "./components/social/Securety";
import LifeRhythmsForm from "./components/profiles/LifeRhythmsForm";
import AdminReport from "./components/pages/AdminReport";
import UsersList from "./components/pages/UsersList";
import SubscriptionPay from "./components/pages/SubscriptionPay";
import MessagesDetails from "./components/pages/MessagesDetails";
import NotRenewedUsers from "./components/pages/NotRenewedUsers";
import LinkedInCallback from "./components/social/LinkedInCallback";
import AdminModelDetails from "./components/admin/AdminModelDetails";
import ResetPassword from "./components/pages/ResetPassword";

// Protected Route Component (For regular users)
const UserProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("accessToken");
  return token ? children : <Navigate to="/login" />;
};

// Public Route Component (Redirect to dashboard if logged in)
const PublicRoute = ({ children }) => {
  const token = localStorage.getItem("accessToken");
  return !token ? children : <Navigate to="/dashboard" />;
};

// Main Layout Component
const MainLayout = ({ children }) => (
  <div className="flex flex-col min-h-screen">
    <Header />
    <main className="flex-grow">{children}</main>
    <Footer />
  </div>
);

// ✅ PlanForm component alag banayein
const PlanFormWrapper = () => {
  return <AdminAddNewPlan />;
};

// Admin Layout Component
const AdminLayout = () => {
  return <AdminDashboard />;
};

export default function App() {
  return (
    <UserProfileProvider>
      <Routes>
        {/* Admin Routes - NEW STRUCTURE */}
        <Route path="/admin-login" element={<AdminLogin />} />

        {/* Main Admin Route with nested routes */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        />

        {/* Old admin-dashboard route - redirect to new structure */}
        <Route
          path="/admin-dashboard"
          element={<Navigate to="/admin" replace />}
        />

        {/* Old admin routes - keep for backward compatibility */}
        <Route
          path="/admin-reports"
          element={
            <ProtectedRoute>
              <AdminReport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users/:type"
          element={
            <ProtectedRoute>
              <UsersList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/subscribe"
          element={
            <ProtectedRoute>
              <SubscriptionPay />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/messages"
          element={
            <ProtectedRoute>
              <MessagesDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users/not-renewed"
          element={
            <ProtectedRoute>
              <NotRenewedUsers />
            </ProtectedRoute>
          }
        />

        {/* User Details Route - IMPORTANT: Change path */}
        {/* <Route
          path="/admin/users/:userId"
          element={
            <ProtectedRoute>
              <AdminModelDetails />
            </ProtectedRoute>
          }
        /> */}

        <Route
          path="/admin/models/:userId"
          element={
            <ProtectedRoute>
              <AdminModelDetails />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/users/:userId"
          element={
            <ProtectedRoute>
              <AdminModelDetails />
            </ProtectedRoute>
          }
        />

        {/* payment result routes */}
        <Route
          path="/payment-success"
          element={
            <MainLayout>
              <PaymentSuccess />
            </MainLayout>
          }
        />
        <Route
          path="/payment-failed"
          element={
            <MainLayout>
              <PaymentFailed />
            </MainLayout>
          }
        />
        <Route path="/auth/linkedin/callback" element={<LinkedInCallback />} />

        <Route path="/admin-plans-new" element={<PlanFormWrapper />} />
        <Route path="/admin/blogs/create" element={<CreateArticle />} />
        <Route path="/admin/blogs/edit/:id" element={<EditArticle />} />
        <Route path="/blogs/:id" element={<ArticleDetails />} />

        {/* Public Routes WITH Header & Footer */}
        <Route
          path="/"
          element={
            <MainLayout>
              <Home />
            </MainLayout>
          }
        />
        <Route
          path="/login"
          element={
            <MainLayout>
              <PublicRoute>
                <Login />
              </PublicRoute>
            </MainLayout>
          }
        />
        <Route
          path="/register"
          element={
            <MainLayout>
              <PublicRoute>
                <Register />
              </PublicRoute>
            </MainLayout>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <MainLayout>
              <PublicRoute>
                <ForgotPassword />
              </PublicRoute>
            </MainLayout>
          }
        />
        <Route
          path="/reset-password/:token"
          element={
            <MainLayout>
              <PublicRoute>
                <ResetPassword />
              </PublicRoute>
            </MainLayout>
          }
        />

        {/* plan Routes */}
        <Route
          path="/plans"
          element={
            <UserProtectedRoute>
              <UserPlans />
            </UserProtectedRoute>
          }
        />
        {/* Cart Routes */}
        <Route
          path="/cart"
          element={
            <MainLayout>
              <UserProtectedRoute>
                <Cart />
              </UserProtectedRoute>
            </MainLayout>
          }
        />
        {/* Matches Routes */}
        <Route
          path="/matches"
          element={
            <UserProtectedRoute>
              <MatchesPage />
            </UserProtectedRoute>
          }
        />
        {/* Protected User Routes WITH Header & Footer */}
        <Route
          path="/dashboard/*"
          element={
            <MainLayout>
              <UserProtectedRoute>
                <UserDashboard />
              </UserProtectedRoute>
            </MainLayout>
          }
        />
        <Route
          path="/create-profile"
          element={
            <MainLayout>
              <UserProtectedRoute>
                <UserCreateForm />
              </UserProtectedRoute>
            </MainLayout>
          }
        />
        <Route
          path="/edit-profile"
          element={
            <MainLayout>
              <UserProtectedRoute>
                <EditProfile />
              </UserProtectedRoute>
            </MainLayout>
          }
        />
        <Route
          path="/contact"
          element={
            <MainLayout>
              <Contact />
            </MainLayout>
          }
        />
        <Route
          path="/about"
          element={
            <MainLayout>
              <About />
            </MainLayout>
          }
        />
        <Route
          path="/blog"
          element={
            <MainLayout>
              <BlogPage />
            </MainLayout>
          }
        />

        {/* Matches Routes WITH Header & Footer */}
        <Route
          path="/matches"
          element={
            <MainLayout>
              <UserProtectedRoute>
                <MatchesPage />
              </UserProtectedRoute>
            </MainLayout>
          }
        />
        {/* Member Routes WITH Header & Footer */}
        <Route
          path="/privacy-policy"
          element={
            <MainLayout>
              <PrivacyPolicy />
            </MainLayout>
          }
        />
        <Route
          path="/accessibility"
          element={
            <MainLayout>
              <Accessibility />
            </MainLayout>
          }
        />
        <Route
          path="/imprint"
          element={
            <MainLayout>
              <Imprint />
            </MainLayout>
          }
        />
        <Route
          path="/Online-dating-policy"
          element={
            <MainLayout>
              <OnlineDating />
            </MainLayout>
          }
        />
        <Route
          path="/terms-and-conditions"
          element={
            <MainLayout>
              <TermsAndConditions />
            </MainLayout>
          }
        />
        <Route
          path="/security"
          element={
            <MainLayout>
              <Securety />
            </MainLayout>
          }
        />
        <Route
          path="/members"
          element={
            <MainLayout>
              <UserProtectedRoute>
                <MembersPage />
              </UserProtectedRoute>
            </MainLayout>
          }
        />
        <Route
          path="/profile-views"
          element={
            <MainLayout>
              <UserProtectedRoute>
                <ProfileViews />
              </UserProtectedRoute>
            </MainLayout>
          }
        />
        <Route
          path="/life-rhythms"
          element={
            <MainLayout>
              <LifeRhythmsForm />
            </MainLayout>
          }
        />
        <Route
          path="/coming-soon"
          element={
            <MainLayout>
              <FallbackPage />
            </MainLayout>
          }
        />
        <Route
          path="/twitter"
          element={
            <MainLayout>
              <TwitterPage />
            </MainLayout>
          }
        />
        <Route
          path="/facebook"
          element={
            <MainLayout>
              <FacebookPage />
            </MainLayout>
          }
        />
        <Route
          path="/linkedin"
          element={
            <MainLayout>
              <LinkedInPage />
            </MainLayout>
          }
        />
        {/* Fallback Route */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <ToastContainer />
    </UserProfileProvider>
  );
}





































































// import React from "react";
// import { Routes,Route, Navigate,useNavigate,BrowserRouter,} from "react-router-dom";
// import { UserProfileProvider } from "./components/context/UseProfileContext";
// import Header from "./components/home/Header";
// import Footer from "./components/home/Footer";
// // App.jsx / main component
// // import './styles/lumira-theme.css';

// // Auth Pages
// import Login from "./components/pages/Login";
// import Register from "./components/pages/Register";
// import ForgotPassword from "./components/pages/ForgotPassword";

// // Main Pages
// import Home from "./components/pages/Home";

// //Admin Plan se related routes
// import PaymentSuccess from "./components/pages/PaymentSuccess";
// import PaymentFailed from "./components/pages/PaymentFailed";

// // Dashboard & Profile Pages
// import UserDashboard from "./components/dashboard/UserDashbord";
// import UserCreateForm from "./components/profiles/CreateProfile";
// import EditProfile from "./components/profiles/EditProfile";

// // Admin Setup
// import ProtectedRoute from "./components/admin/ProtectedRoute";
// import AdminPage from "./components/admin/AdminPage";
// import AdminLogin from "./components/admin/AdminLogin";

// // Chat System
// // import ChatModule from "./components/chatsystem/ChatModule";
// // import AdvancedSearch from "./components/chatsystem/AdvancedSearch";

// // Match System
// import MatchesPage from "./components/MatchSystem/MatchesPage";
// import MembersPage from "./components/pages/MemberPage";
// import Contact from "./components/pages/Contact";
// // Linkde login button
// // import LinkedInCallback from "./components/social/LinkedInCallback";
// import AddNewPlan from "./components/admin/AddPlanForm";
// import UserPlans from "./components/pages/UserPlans";
// import Cart from "./components/pages/cart";
// import { useState } from "react";
// // Admin plan
// import AdminAddNewPlan from "./components/pages/AdminAddNewPlan";
// import BlogPage from "./components/pages/BlogPage";

// import AdminBlog from "./components/pages/AdminBlog";
// import CreateArticle from "./components/pages/CreateArticle";

// import ArticleDetails from "./components/pages/ArticleDetails";

// import EditArticle from "./components/pages/EditArticle";

// import { ToastContainer } from "react-toastify";
// // profile view recent activity
// import ProfileViews from "./components/pages/ProfileViews";

// // import About from './componets/pages/AboutPage.jsx';
// import About from "./components/pages/AboutPage";
// import FallbackPage from "./components/pages/FallbackPage";
// import FacebookPage from "./components/social/FacebookPage";
// import LinkedInPage from "./components/social/LinkedinPage";
// import TwitterPage from "./components/social/TwitterPage";
// import PrivacyPolicy from "./components/social/PrivacyPolicy";
// import Accessibility from "./components/social/Accessibility";
// import Imprint from "./components/social/Imprint";
// import OnlineDating from "./components/social/OnlineDating";
// import TermsAndConditions from "./components/social/TermsAndConditions";
// import Securety from "./components/social/Securety";
// import LifeRhythmsForm from "./components/profiles/LifeRhythmsForm";

// import AdminReport from "./components/pages/AdminReport";
// import UsersList from "./components/pages/UsersList";
// import SubscriptionPay from "./components/pages/SubscriptionPay";
// import MessagesDetails from "./components/pages/MessagesDetails";
// import NotRenewedUsers  from "./components/pages/NotRenewedUsers";
// import LinkedInCallback from "./components/social/LinkedInCallback";
// import AdminModelDetails from "./components/admin/AdminModelDetails";
// import ResetPassword from "./components/pages/ResetPassword";

// // Protected Route Component (For regular users)
// const UserProtectedRoute = ({ children }) => {
//   const token = localStorage.getItem("accessToken");
//   return token ? children : <Navigate to="/login" />;
// };

// // Public Route Component (Redirect to dashboard if logged in)
// const PublicRoute = ({ children }) => {
//   const token = localStorage.getItem("accessToken");
//   return !token ? children : <Navigate to="/dashboard" />;
// };

// // Main Layout Component
// const MainLayout = ({ children }) => (
//   <div className="flex flex-col min-h-screen">
//     <Header />
//     <main className="flex-grow">{children}</main>
//     <Footer />
//   </div>
// );

// // ✅ PlanForm component alag banayein
// const PlanFormWrapper = () => {
//   // Yahan aap useState aur useNavigate use kar sakte hain
//   // Kyunki yeh component HashRouter ke ANDAR hai
//   return <AdminAddNewPlan />;
// };

// export default function App() {
//   return (
//     // <HashRouter>
//     <UserProfileProvider>
//       <Routes>
//         <Route path="/admin-plans-new" element={<PlanFormWrapper />} />
//         {/* Admin Routes - SEPARATE (No Header/Footer) */}
//         <Route path="/admin-login" element={<AdminLogin />} />
//         <Route
//           path="/admin-dashboard"
//           element={
//             <ProtectedRoute>
//               <AdminPage />
//             </ProtectedRoute>
//           }
//         />

//         {/* // admin routes for reports  */}
//          <Route
//           path="/admin-reports"
//           element={
//             <ProtectedRoute>
//               <AdminReport />
//             </ProtectedRoute>
//           }
//         />
//         <Route
//           path="/admin/users/:type"
//           element={
//             <ProtectedRoute>
//               <UsersList />
//             </ProtectedRoute>
//           }
//         />
//         <Route
//           path="/admin/subscribe"
//           element={
//             <ProtectedRoute>
//               <SubscriptionPay />
//             </ProtectedRoute>
//           }
//         />
//         <Route
//           path="/admin/messages"
//           element={
//             <ProtectedRoute>
//               <MessagesDetails />
//             </ProtectedRoute>
//           }
//         />
//         <Route
//           path="/admin/users/not-renewed"
//           element={
//             <ProtectedRoute>
//               <NotRenewedUsers />
//             </ProtectedRoute>
//           }
//         />
//         <Route
//           path="/admin/models/:userId"
//           element={
//             <ProtectedRoute>
//           <AdminModelDetails />
//             </ProtectedRoute>
//           }
//         />
// {/* <Route path="/admin/models/:userId" element={<AdminModelDetails />} /> */}

//         {/* payment result routes */}
//         <Route
//           path="/payment-success"
//           element={
//             <MainLayout>
//               <PaymentSuccess />
//             </MainLayout>
//           }
//         />
//         {/* payment result routes */}
//         <Route
//           path="/payment-failed"
//           element={
//             <MainLayout>
//               <PaymentFailed />
//             </MainLayout>
//           }
//         />
//         <Route path="/auth/linkedin/callback" element={<LinkedInCallback />} />

//         {/* lindin callbackek route  */}
//         {/* <Route path="/linkedin-callback" element={<LinkedInCallback />} /> */}
//         {/* <Route path="/linkedin-callback" element={<LinkedinCallback />} /> */}
//         <Route path="/admin/blogs/create" element={<CreateArticle />} />
//         <Route path="/admin/blogs/edit/:id" element={<EditArticle />} />
//         <Route path="/blogs/:id" element={<ArticleDetails />} />
//         {/* Public Routes WITH Header & Footer */}
//         <Route
//           path="/"
//           element={
//             <MainLayout>
//               <Home />
//             </MainLayout>
//           }
//         />
//         <Route
//           path="/login"
//           element={
//             <MainLayout>
//               <PublicRoute>
//                 <Login />
//               </PublicRoute>
//             </MainLayout>
//           }
//         />
//         <Route
//           path="/register"
//           element={
//             <MainLayout>
//               <PublicRoute>
//                 <Register />
//               </PublicRoute>
//             </MainLayout>
//           }
//         />
//         <Route
//           path="/forgot-password"
//           element={
//             <MainLayout>
//               <PublicRoute>
//                 <ForgotPassword />
//               </PublicRoute>
//             </MainLayout>
//           }
//         />
//          <Route
//           path="/reset-password/:token"
//           element={
//             <MainLayout>
//               <PublicRoute>
//                 <ResetPassword />
//               </PublicRoute>
//             </MainLayout>
//           }
//         />

// {/*

//         <Route
//           path="/search"
//           element={
//             <UserProtectedRoute>
//               <AdvancedSearch />
//             </UserProtectedRoute>
//           }
//         /> */}

//         {/* plan Routes */}
//         <Route
//           path="/plans"
//           element={
//             <UserProtectedRoute>
//               <UserPlans />
//             </UserProtectedRoute>
//           }
//         />
//         {/* Cart Routes */}
//         <Route
//           path="/cart"
//           element={
//             <MainLayout>
//               <UserProtectedRoute>
//                 <Cart />
//               </UserProtectedRoute>
//             </MainLayout>
//           }
//         />
//         {/* Matches Routes */}
//         <Route
//           path="/matches"
//           element={
//             <UserProtectedRoute>
//               <MatchesPage />
//             </UserProtectedRoute>
//           }
//         />
//         {/* Protected User Routes WITH Header & Footer */}
//         <Route
//           path="/dashboard/*"
//           element={
//             <MainLayout>
//               <UserProtectedRoute>
//                 <UserDashboard />
//               </UserProtectedRoute>
//             </MainLayout>
//           }
//         />
//         <Route
//           path="/create-profile"
//           element={
//             <MainLayout>
//               <UserProtectedRoute>
//                 <UserCreateForm />
//               </UserProtectedRoute>
//             </MainLayout>
//           }
//         />
//         <Route
//           path="/edit-profile"
//           element={
//             <MainLayout>
//               <UserProtectedRoute>
//                 <EditProfile />
//               </UserProtectedRoute>
//             </MainLayout>
//           }
//         />
//         <Route
//           path="/contact"
//           element={
//             <MainLayout>
//               {/* <UserProtectedRoute> */}
//               <Contact />
//               {/* </UserProtectedRoute> */}
//             </MainLayout>
//           }
//         />
//         <Route
//           path="/about"
//           element={
//             <MainLayout>
//               {/* <UserProtectedRoute> */}
//               <About />
//               {/* </UserProtectedRoute> */}
//             </MainLayout>
//           }
//         />
//         <Route
//           path="/blog"
//           element={
//             <MainLayout>
//               <BlogPage />
//             </MainLayout>
//           }
//         />

//         {/* Chat Routes WITH Header & Footer */}
//         {/* <Route
//           path="/chat"
//           element={
//             <MainLayout>
//               <UserProtectedRoute>
//                 <ChatModule />
//               </UserProtectedRoute>
//             </MainLayout>
//           }
//         /> */}
//         {/*
//         <Route
//           path="/search"
//           element={
//             <MainLayout>
//               <UserProtectedRoute>
//                 <AdvancedSearch />
//               </UserProtectedRoute>
//             </MainLayout>
//           }
//         /> */}

//         {/* Matches Routes WITH Header & Footer */}
//         <Route
//           path="/matches"
//           element={
//             <MainLayout>
//               <UserProtectedRoute>
//                 <MatchesPage />
//               </UserProtectedRoute>
//             </MainLayout>
//           }
//         />
//         {/* Member Routes WITH Header & Footer */}
//         <Route
//           path="/privacy-policy"
//           element={
//             <MainLayout>
//               <PrivacyPolicy />
//             </MainLayout>
//           }
//         />
//         <Route
//           path="/accessibility"
//           element={
//             <MainLayout>
//               <Accessibility />
//             </MainLayout>
//           }
//         />
//         <Route
//           path="/imprint"
//           element={
//             <MainLayout>
//               <Imprint />
//             </MainLayout>
//           }
//         />
//         <Route
//           path="/Online-dating-policy"
//           element={
//             <MainLayout>
//               <OnlineDating />
//             </MainLayout>
//           }
//         />
//         <Route
//           path="/terms-and-conditions"
//           element={
//             <MainLayout>
//               <TermsAndConditions />
//             </MainLayout>
//           }
//         />
//         <Route
//           path="/security"
//           element={
//             <MainLayout>
//               <Securety />
//             </MainLayout>
//           }
//         />
//         <Route
//           path="/members"
//           element={
//             <MainLayout>
//               <UserProtectedRoute>
//                 <MembersPage />
//               </UserProtectedRoute>
//             </MainLayout>
//           }
//         />
//         <Route
//           path="/profile-views"
//           element={
//             <MainLayout>
//               <UserProtectedRoute>
//                 <ProfileViews />
//               </UserProtectedRoute>
//             </MainLayout>
//           }
//         />
//         {/* <Route path="/life-rhythms" element={<LifeRhythmsPage />} /> */}
//         <Route
//           path="/life-rhythms"
//           element={
//             <MainLayout>
//               <LifeRhythmsForm />
//             </MainLayout>
//           }
//         />
//         <Route
//           path="/coming-soon"
//           element={
//             <MainLayout>
//               <FallbackPage />
//             </MainLayout>
//           }
//         />
//         <Route
//           path="/twitter"
//           element={
//             <MainLayout>
//               <TwitterPage />
//             </MainLayout>
//           }
//         />
//         <Route
//           path="/facebook"
//           element={
//             <MainLayout>
//               <FacebookPage />
//             </MainLayout>
//           }
//         />
//         <Route
//           path="/linkedin"
//           element={
//             <MainLayout>
//               <LinkedInPage />
//             </MainLayout>
//           }
//         />
//         {/* Fallback Route */}
//         <Route path="*" element={<Navigate to="/" />} />
//       </Routes>
//     </UserProfileProvider>
//   );
// }
