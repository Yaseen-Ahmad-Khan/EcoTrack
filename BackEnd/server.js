const express = require('express');
const path = require('path');
const app = express();
app.use(express.json());

// Serve static frontend files and assets
app.use('/FrontEnd', express.static(path.join(__dirname, '..', 'FrontEnd')));
app.use('/Assets', express.static(path.join(__dirname, '..', 'Assets')));

// Root redirect to frontend landing page
app.get('/', (req, res) => {
    res.redirect('/FrontEnd/index.html');
});

// Enable CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

const sql = require('mssql/msnodesqlv8');
app.listen(5000, () => {
    console.log("Server Running on port 5000");
});
const config = {
    server: 'DESKTOP-LTPKS4P\\SQLEXPRESS',
    database: 'ecotrack',
    driver: 'ODBC Driver 18 for SQL Server',
    options: {
        trustedConnection: true,
        trustServerCertificate: true
    }
};

//displaying users(http://localhost:3000/displayallusers)
app.get('/displayallusers', async (req, res) => {
    await sql.connect(config);
    const result = await sql.query('select * from users');
    res.json(result.recordset);
});

app.get('/catalog/all', async (req, res) => {
    try {
        await sql.connect(config);
        const result = await sql.query("SELECT product_id, product_name FROM products");
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

//register user(postman)
app.post('/registeruser', async (req, res) => {
    try {
        const { full_name, email, password_hash, role, phone_number, address } = req.body;
        await sql.connect(config);

        await sql.query`
            INSERT INTO users (full_name, email, password_hash, role, phone_number, address) 
            VALUES (${full_name}, ${email}, ${password_hash}, ${role}, ${phone_number || null}, ${address || null})
        `;

        res.status(201).json({ message: "User registered successfully!" });
    } catch (err) {
        res.status(400).json({ error: "Registration Failed: " + err.message });
    }
});

//get profile(http://localhost:3000/profile/1)
app.get('/profile/:id', async (req, res) => {
    try {
        await sql.connect(config);
        const { id } = req.params;

        const result = await sql.query`
            SELECT users.full_name, users.email, loyalty_points.points_earned 
            FROM users 
            LEFT JOIN loyalty_points ON users.user_id = loyalty_points.user_id 
            WHERE users.user_id = ${id}
        `;

        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

//login check
app.post('/login', async (req, res) => {
    try {
        await sql.connect(config);
        const { email, password, role } = req.body;

        const result = await sql.query`
            SELECT user_id, password_hash, role 
            FROM users 
            WHERE email = ${email}
        `;

        if (result.recordset.length === 0) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const user = result.recordset[0];

        if (user.password_hash !== password) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        if (user.role !== role) {
            return res.status(403).json({ error: "Account type mismatch. Please select the correct login tab." });
        }

        res.json({ message: "Login successful", role: user.role, user_id: user.user_id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

//  Total Items for a Vendor (http://localhost:3000/inventory/total/1)
app.get('/inventory/total/:vid', async (req, res) => {
    try {
        await sql.connect(config);
        const { vid } = req.params;

        const result = await sql.query`
            SELECT COUNT(item_id) AS total_items 
            FROM inventory 
            WHERE vendor_id = ${vid}
        `;

        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).send("Error fetching count: " + err.message);
    }
});

//  Total Items Saved (Impact Analytics)(http://localhost:3000/analytics/total-saved)
app.get('/analytics/total-saved', async (req, res) => {
    try {
        await sql.connect(config);
        const result = await sql.query('SELECT SUM(quantity_ordered) AS total_items_saved FROM orders');

        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).send("Error calculating total saved: " + err.message);
    }
});

//  Total CO2 Saved (Environmental Impact)(http://localhost:3000/analytics/co2-saved)
app.get('/analytics/co2-saved', async (req, res) => {
    try {
        await sql.connect(config);

        const result = await sql.query('SELECT SUM(quantity_ordered * 2.5) AS total_co2_saved_kg FROM orders');

        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).send("Error calculating CO2 impact: " + err.message);
    }
});

// Revenue Recovered for a Vendor (Financial Analytics)(http://localhost:3000/analytics/revenue/1)
app.get('/analytics/revenue/:vid', async (req, res) => {
    try {
        await sql.connect(config);
        const { vid } = req.params;

        const result = await sql.query`
            SELECT SUM(orders.total_amount) AS revenue_recovered 
            FROM orders 
            JOIN inventory ON orders.item_id = inventory.item_id 
            WHERE inventory.vendor_id = ${vid} 
            AND orders.order_type = 'purchase'
        `;

        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).send("Error calculating revenue: " + err.message);
    }
});

//  Completed Donations (NGO Success Metrics)(http://localhost:3000/analytics/completed-donations)
app.get('/analytics/completed-donations', async (req, res) => {
    try {
        await sql.connect(config);

        const result = await sql.query("SELECT COUNT(*) AS completed_donations FROM claims WHERE claim_status = 'collected'");

        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).send("Error fetching donation count: " + err.message);
    }
});

//  Monthly Orders Trend (Time-Series Analytics)(http://localhost:3000/analytics/monthly-trend)
app.get('/analytics/monthly-trend', async (req, res) => {
    try {
        await sql.connect(config);

        const result = await sql.query(`
            SELECT 
                MONTH(order_date) AS month_num, 
                COUNT(*) AS total_orders 
            FROM orders 
            GROUP BY MONTH(order_date)
            ORDER BY month_num ASC
        `);

        res.json(result.recordset);
    } catch (err) {
        res.status(500).send("Error fetching monthly trend: " + err.message);
    }
});

app.get('/displaydiscounted', async (req, res) => {
    await sql.connect(config);
    const result = await sql.query("SELECT * FROM inventory WHERE status = 'discounted' AND quantity > 0");
    res.json(result.recordset);
});

app.post('/filterbycategory', async (req, res) => {
    await sql.connect(config);
    const { category_name } = req.body;

    const result = await sql.query`
        SELECT inventory.*, products.product_name
        FROM inventory
        JOIN products ON inventory.product_id = products.product_id
        JOIN categories ON products.category_id = categories.category_id
        WHERE categories.category_name = ${category_name}
        AND inventory.status IN ('available', 'discounted')
        AND inventory.quantity > 0
    `;

    res.json(result.recordset);
});

app.post('/filterbyprice', async (req, res) => {
    await sql.connect(config);
    const { min_price, max_price } = req.body;

    const result = await sql.query`
        SELECT i.*, p.product_name 
        FROM inventory i
        JOIN products p ON i.product_id = p.product_id
        WHERE i.current_price >= ${min_price}
        AND i.current_price <= ${max_price}
        AND i.status IN ('available', 'discounted')
        AND i.quantity > 0
    `;

    res.json(result.recordset);
});

app.get('/topvendors', async (req, res) => {
    await sql.connect(config);

    const result = await sql.query(`
        SELECT u.full_name,
        AVG(r.rating) AS AVERAGERATING
        FROM users u
        INNER JOIN reviews r 
        ON r.vendor_id = u.user_id
        GROUP BY u.full_name, u.user_id
        ORDER BY AVG(r.rating) DESC
    `);

    res.json(result.recordset);
});

app.post('/orderhistory', async (req, res) => {
    await sql.connect(config);
    const { buyer_id } = req.body;

    const result = await sql.query`
        SELECT * FROM orders
        WHERE buyer_id = ${buyer_id}
        ORDER BY order_date DESC
    `;

    res.json(result.recordset);
});

app.post('/placeorder', async (req, res) => {
    try {
        await sql.connect(config);
        const { buyer_id, item_id, order_type, quantity_ordered, total_amount, delivery_name, delivery_phone, delivery_address } = req.body;

        // Check available stock first
        const stockCheck = await sql.query`
            SELECT quantity FROM inventory WHERE item_id = ${item_id}
        `;
        if (stockCheck.recordset.length === 0) {
            return res.status(404).json({ error: "Item not found in inventory." });
        }
        if (stockCheck.recordset[0].quantity < quantity_ordered) {
            return res.status(400).json({ error: "Insufficient stock available." });
        }

        // Insert the order
        await sql.query`
            INSERT INTO orders 
            (buyer_id, item_id, order_type, quantity_ordered, total_amount)
            VALUES 
            (${buyer_id}, ${item_id}, ${order_type}, ${quantity_ordered}, ${total_amount})
        `;

        // Decrease inventory quantity
        await sql.query`
            UPDATE inventory 
            SET quantity = quantity - ${quantity_ordered}, last_updated = GETDATE()
            WHERE item_id = ${item_id}
        `;

        // Increment user's loyalty points (10 points per item rescued)
        const pointsToAdd = quantity_ordered * 10;

        // Check if loyalty record exists
        const loyaltyCheck = await sql.query`
            SELECT reward_id FROM loyalty_points WHERE user_id = ${buyer_id}
        `;

        if (loyaltyCheck.recordset.length > 0) {
            await sql.query`
                UPDATE loyalty_points 
                SET points_earned = points_earned + ${pointsToAdd}, last_updated = GETDATE()
                WHERE user_id = ${buyer_id}
            `;
        } else {
            await sql.query`
                INSERT INTO loyalty_points (user_id, points_earned, last_updated)
                VALUES (${buyer_id}, ${pointsToAdd}, GETDATE())
            `;
        }

        res.status(201).json({ message: "Order placed successfully", pointsEarned: pointsToAdd });
    } catch (err) {
        res.status(500).json({ error: "Order failed: " + err.message });
    }
});

app.post('/updatephone', async (req, res) => {
    await sql.connect(config);
    const { user_id, phone_number } = req.body;

    await sql.query`
        UPDATE users 
        SET phone_number = ${phone_number}
        WHERE user_id = ${user_id}
    `;

    res.send("Phone updated successfully");
});

app.post('/updateemail', async (req, res) => {
    await sql.connect(config);
    const { user_id, email } = req.body;

    await sql.query`
        UPDATE users
        SET email = ${email}
        WHERE user_id = ${user_id}
    `;

    res.send("Email updated successfully");
});

app.post('/updatepassword', async (req, res) => {
    await sql.connect(config);
    const { user_id, password_hash } = req.body;

    await sql.query`
        UPDATE users
        SET password_hash = ${password_hash}
        WHERE user_id = ${user_id}
    `;

    res.send("Password updated successfully");
});

app.delete('/deleteuser', async (req, res) => {
    await sql.connect(config);
    const { user_id } = req.body;

    await sql.query`
        DELETE FROM users
        WHERE user_id = ${user_id}
    `;

    res.send("User deleted successfully");
});

app.post('/filterbyrole', async (req, res) => {
    await sql.connect(config);
    const { role } = req.body;

    const result = await sql.query`
        SELECT * FROM users
        WHERE role = ${role}
    `;

    res.json(result.recordset);
});

app.get('/outofstock', async (req, res) => {
    await sql.connect(config);

    const result = await sql.query(`
        SELECT i.*, p.product_name 
        FROM inventory i
        LEFT JOIN products p ON i.product_id = p.product_id
        WHERE i.quantity = 0
    `);

    res.json(result.recordset);
});

app.post('/addstock', async (req, res) => {
    try {
        await sql.connect(config);
        const { product_id, vendor_id, quantity, original_price, current_price, expiry_date, status } = req.body;

        await sql.query`
            INSERT INTO inventory 
            (product_id, vendor_id, quantity, original_price, current_price, expiry_date, status)
            VALUES
            (${product_id}, ${vendor_id}, ${quantity}, ${original_price}, ${current_price}, ${expiry_date}, ${status || 'available'})
        `;

        // Automatically trigger logic to apply discounts/donations immediately
        await runAutoLogic();

        res.status(201).json({ message: "Stock added successfully and maintenance logic applied." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/lowstock', async (req, res) => {
    await sql.connect(config);
    const { vendor_id, threshold } = req.body;
    const min_qty = threshold || 10;

    const result = await sql.query`
        SELECT product_id, quantity
        FROM inventory
        WHERE quantity < ${min_qty} AND vendor_id = ${vendor_id}
    `;

    res.json(result.recordset);
});

app.post('/expiryreport', async (req, res) => {
    try {
        await sql.connect(config);
        const { vendor_id } = req.body;

        const result = await sql.query`
            SELECT i.*, p.product_name
            FROM inventory i
            LEFT JOIN products p ON i.product_id = p.product_id
            WHERE i.vendor_id = ${vendor_id}
            ORDER BY i.expiry_date ASC
        `;

        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/claims/approve', async (req, res) => {
    try {
        await sql.connect(config);
        const { claim_id, item_id, quantity_claimed } = req.body;

        // 1. Update claim status
        await sql.query`
            UPDATE claims 
            SET claim_status = 'approved' 
            WHERE claim_id = ${claim_id}
        `;

        // 2. Deduct from inventory
        await sql.query`
            UPDATE inventory 
            SET quantity = quantity - ${quantity_claimed}, last_updated = GETDATE()
            WHERE item_id = ${item_id}
        `;

        res.json({ message: "Claim approved and inventory updated." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/updateprice', async (req, res) => {
    await sql.connect(config);
    const { item_id, new_price } = req.body;

    await sql.query`
        UPDATE inventory
        SET current_price = ${new_price}, last_updated = GETDATE()
        WHERE item_id = ${item_id}
    `;

    res.send("Price updated successfully");
});

app.post('/stocksummary', async (req, res) => {
    await sql.connect(config);
    const { vendor_id } = req.body;

    const result = await sql.query`
        SELECT status, COUNT(*) AS count_per_status
        FROM inventory
        WHERE vendor_id = ${vendor_id}
        GROUP BY status
    `;

    res.json(result.recordset);
});

// Function to run the maintenance logic
const runAutoLogic = async () => {
    try {
        await sql.connect(config);

        // 1. Auto Donate (If expiring within 10 days) - Flag as 'donated'
        await sql.query`
            UPDATE inventory 
            SET status = 'donated' 
            WHERE expiry_date <= DATEADD(day, 10, GETDATE()) 
            AND status != 'donated' AND status != 'expired'
        `;

        // 2. Auto Discount (30% off if expiring within 15 days - just as a buffer before donation)
        await sql.query`
            UPDATE inventory 
            SET status = 'discounted', current_price = original_price * 0.7 
            WHERE expiry_date <= DATEADD(day, 15, GETDATE()) 
            AND status = 'available'
        `;

        // 3. Auto Delete Expired Items
        // Note: This might fail if there are active claims/orders due to FK constraints.
        // We attempt to delete items where expiry_date is in the past.
        await sql.query`
            DELETE FROM inventory 
            WHERE expiry_date < GETDATE()
        `;

        // 4. Auto Complete Deliveries (Mark as delivered if order is > 5 days old and still pending)
        await sql.query`
            UPDATE logistics 
            SET delivery_status = 'delivered', actual_arrival = GETDATE()
            FROM logistics l
            JOIN orders o ON l.order_id = o.order_id
            WHERE o.order_date <= DATEADD(day, -5, GETDATE()) 
            AND l.delivery_status IN ('pending', 'in-transit')
        `;

        // 5. Auto Complete Payments (Mark as completed if order is > 5 days old and still pending)
        await sql.query`
            UPDATE payments 
            SET payment_status = 'completed'
            FROM payments p
            JOIN orders o ON p.order_id = o.order_id
            WHERE o.order_date <= DATEADD(day, -5, GETDATE()) 
            AND p.payment_status = 'pending'
        `;

        console.log("Inventory maintenance and Order completion logic executed successfully.");
    } catch (err) {
        console.error("Maintenance logic error:", err);
        // We don't throw here to prevent crashing the server on automated tasks
    }
};

// POST Route to trigger this logic manually
app.post('/inventory/refresh', async (req, res) => {
    try {
        await runAutoLogic();
        res.status(200).send({ message: "Inventory statuses and prices updated." });
    } catch (err) {
        res.status(500).send({ error: "Failed to update inventory logic: " + err.message });
    }
});

app.get('/donations/available', async (req, res) => {
    try {
        await sql.connect(config);
        const result = await sql.query("SELECT * FROM inventory WHERE status = 'donated' AND quantity > 0");
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/claims/create', async (req, res) => {
    try {
        const { item_id, ngo_id, quantity } = req.body;
        await sql.connect(config);

        await sql.query`
            INSERT INTO claims (item_id, ngo_id, claim_status, quantity_claimed) 
            VALUES (${item_id}, ${ngo_id}, 'pending', ${quantity || 1})
        `;

        res.status(201).json({ message: "Claim submitted successfully" });
    } catch (err) {
        res.status(500).json({ error: "Claim submission failed: " + err.message });
    }
});

app.get('/claims/history/:ngo_id', async (req, res) => {
    try {
        await sql.connect(config);
        const { ngo_id } = req.params;

        const result = await sql.query`
            SELECT * FROM claims 
            WHERE ngo_id = ${ngo_id}
        `;

        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/claims/pending/:vendor_id', async (req, res) => {
    try {
        await sql.connect(config);
        const { vendor_id } = req.params;

        const result = await sql.query`
            SELECT c.* FROM claims c
            JOIN inventory i ON c.item_id = i.item_id 
            WHERE i.vendor_id = ${vendor_id} AND c.claim_status = 'pending'
        `;

        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/logistics/active', async (req, res) => {
    try {
        await sql.connect(config);
        const result = await sql.query("SELECT * FROM logistics WHERE delivery_status = 'in-transit'");
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/inventory/:item_id', async (req, res) => {
    try {
        await sql.connect(config);
        const { item_id } = req.params;

        // 1. Remove related claims first
        await sql.query`DELETE FROM claims WHERE item_id = ${item_id}`;

        // 2. Remove related orders (logistics and payments will cascade delete if configured, 
        // but we'll do it manually if needed. According to schema, orders.order_id is referenced by others with cascade)
        await sql.query`DELETE FROM orders WHERE item_id = ${item_id}`;

        // 3. Now remove the item from inventory
        await sql.query`
            DELETE FROM inventory 
            WHERE item_id = ${item_id}
        `;

        res.json({ message: "Item and related records removed successfully." });
    } catch (err) {
        res.status(500).json({ error: "Failed to remove item: " + err.message });
    }
});

app.get('/notifications/unread/:user_id', async (req, res) => {
    try {
        await sql.connect(config);
        const { user_id } = req.params;

        const result = await sql.query`
            SELECT * FROM notifications 
            WHERE user_id = ${user_id} AND is_read = 0
        `;

        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/logistics/stats/success-rate', async (req, res) => {
    try {
        await sql.connect(config);
        const result = await sql.query(`
            SELECT (COUNT(CASE WHEN delivery_status = 'delivered' THEN 1 END) * 100.0 / COUNT(*)) AS success_rate 
            FROM logistics
        `);
        res.json({ success_rate: result.recordset[0].success_rate });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.get('/displaydiscounted/full', async (req, res) => {
    try {
        await sql.connect(config);
        const result = await sql.query(`
            SELECT i.*, p.product_name 
            FROM inventory i
            JOIN products p ON i.product_id = p.product_id
            WHERE i.status IN ('available', 'discounted') AND i.quantity > 0
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


app.post('/orderhistory/full', async (req, res) => {
    try {
        await sql.connect(config);
        const { buyer_id } = req.body;

        const result = await sql.query`
            SELECT 
                o.order_id, 
                o.order_date, 
                o.item_id,
                o.quantity_ordered, 
                o.total_amount, 
                p.product_name,
                pay.payment_status,
                pay.payment_method,
                l.delivery_status
            FROM orders o
            LEFT JOIN inventory i ON o.item_id = i.item_id
            LEFT JOIN products p ON i.product_id = p.product_id
            LEFT JOIN payments pay ON o.order_id = pay.order_id
            LEFT JOIN logistics l ON o.order_id = l.order_id
            WHERE o.buyer_id = ${buyer_id}
            ORDER BY o.order_date DESC
        `;

        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/placeorder/full', async (req, res) => {
    try {
        await sql.connect(config);
        const {
            buyer_id, item_id, quantity_ordered, total_amount,
            delivery_name, delivery_address, payment_method, points_used
        } = req.body;

        // 1. Check if enough stock exists
        const stockCheck = await sql.query`
            SELECT quantity FROM inventory WHERE item_id = ${item_id}
        `;
        if (stockCheck.recordset.length === 0) {
            return res.status(404).json({ error: "Item not found in inventory." });
        }
        if (stockCheck.recordset[0].quantity < quantity_ordered) {
            return res.status(400).json({ error: "Insufficient stock available." });
        }

        // 2. Insert into orders and instantly capture the new order_id using OUTPUT
        const orderResult = await sql.query`
            INSERT INTO orders (buyer_id, item_id, order_type, quantity_ordered, total_amount)
            OUTPUT INSERTED.order_id
            VALUES (${buyer_id}, ${item_id}, 'purchase', ${quantity_ordered}, ${total_amount})
        `;
        const new_order_id = orderResult.recordset[0].order_id;

        // 3. Insert into payments table (Card is completed immediately, Cash is pending)
        const payStatus = payment_method === 'card' ? 'completed' : 'pending';
        await sql.query`
            INSERT INTO payments (order_id, payment_method, payment_status, amount_paid)
            VALUES (${new_order_id}, ${payment_method}, ${payStatus}, ${total_amount})
        `;

        // 4. Insert into logistics table for tracking
        await sql.query`
            INSERT INTO logistics (order_id, delivery_status, delivery_person_name, estimated_arrival)
            VALUES (${new_order_id}, 'pending', 'Unassigned', DATEADD(hour, 2, GETDATE()))
        `;

        // 5. Deduct quantity from inventory
        await sql.query`
            UPDATE inventory 
            SET quantity = quantity - ${quantity_ordered}, last_updated = GETDATE()
            WHERE item_id = ${item_id}
        `;

        // 6. Handle Loyalty Points (Grant 10 per item, deduct if they spent points)
        const pointsEarned = quantity_ordered * 10;
        const loyaltyCheck = await sql.query`
            SELECT points_earned FROM loyalty_points WHERE user_id = ${buyer_id}
        `;

        if (loyaltyCheck.recordset.length > 0) {
            await sql.query`
                UPDATE loyalty_points 
                SET points_earned = points_earned + ${pointsEarned} - ${points_used || 0}, last_updated = GETDATE()
                WHERE user_id = ${buyer_id}
            `;
        } else {
            await sql.query`
                INSERT INTO loyalty_points (user_id, points_earned, last_updated)
                VALUES (${buyer_id}, ${pointsEarned}, GETDATE())
            `;
        }

        res.status(201).json({
            message: "Order fully processed",
            order_id: new_order_id,
            pointsEarned: pointsEarned
        });

    } catch (err) {
        res.status(500).json({ error: "Checkout transaction failed: " + err.message });
    }
});