import axios from "axios";

const BASE_URL = "https://backend-q0wc.onrender.com/api/cart";

//  Get all cart items by user_id
export const fetchCartItems = async (userId) => {
    const res = await axios.get(`${BASE_URL}/${userId}`);
    return res.data;
};

//  Add to cart
export const addToCart = async (planId, userId) => {
    const res = await axios.post(`${BASE_URL}`, {
        plan_id: planId,
        user_id: userId,
    });
    return res.data;
};


// Remove from cart
export const removeFromCart = async (id) => {
    const res = await axios.delete(`${BASE_URL}/${id}`);
    return res.data;
};

// Buy item
export const buyCartItem = async (id) => {
    const res = await axios.put(`${BASE_URL}/buy/${id}`);
    return res.data;
};
