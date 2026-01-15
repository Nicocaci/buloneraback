import { MercadoPagoConfig, Preference } from 'mercadopago';
import dotenv from "dotenv";
dotenv.config();

const client = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN
});

export const createOrder = async (req, res) => {
    try {
        const { cart, payer } = req.body;

        // Validaciones fuertes
        if (!cart || !cart.products || cart.products.length === 0) {
            return res.status(400).json({ error: 'Carrito vacío o inválido' });
        }

        if (!payer || !payer.email) {
            return res.status(400).json({ error: 'Email del pagador es obligatorio' });
        }

        const items = cart.products.map(item => {
            const product = item.product || item;

            if (!product?.item || !product?.precio) {
                throw new Error('Producto inválido');
            }

            return {
                title: String(product.item),
                unit_price: Number(product.precio),
                quantity: Number(item.quantity || 1),
                currency_id: 'ARS'
            };
        });

        const preference = new Preference(client);

        const result = await preference.create({
            body: {
                items,
                payer: {
                    name: payer.name,
                    surname: payer.surname,
                    email: payer.email
                },
                back_urls: {
                    success: "http://localhost:5173/success",
                    failure: "http://localhost:5173/failure"
                }
            }
        });

        console.log('Preferencia creada OK:', result);

        res.json({
            preferenceId: result.id,
            init_point: result.init_point,
            sandbox_init_point: result.sandbox_init_point
        });

    } catch (error) {
        console.error('MP ERROR:', error);
        res.status(500).json({ error: error.message });
    }
};