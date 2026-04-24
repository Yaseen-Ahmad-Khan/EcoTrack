const express=require('express');
const app=express();
app.use(express.json());
const sql=require('mssql/msnodesqlv8');
app.listen(3000,()=>{
    console.log("Server Running");
});
const config = {
    server: 'PC', 
    database: 'ecotrack',
    driver: 'ODBC Driver 18 for SQL Server',
    options: {
        trustedConnection: true,
        trustServerCertificate: true 
    }
};

//displaying users(http://localhost:3000/displayallusers)
app.get('/displayallusers',async (req,res)=>
{
    await sql.connect(config);
    const result=await sql.query('select * from users');
    res.json(result.recordset);
});
//register user(postman)
app.post('/registeruser', async (req, res) => {
    try {
        const { full_name, email, password_hash, role } = req.body;
        await sql.connect(config);
        const request = new sql.Request();
        request.input('name', sql.VarChar, full_name);
        request.input('email', sql.VarChar, email);
        request.input('pass', sql.VarChar, password_hash);
        request.input('role', sql.VarChar, role);

        const query = 'insert into users (full_name, email, password_hash, role) values (@name, @email, @pass, @role)';
        await request.query(query);
        res.status(201).send("User registered successfully!");
    } catch (err) {
        res.status(400).send("Registration Failed: " + err.message);
    }
});

//get profile(http://localhost:3000/profile/1)
app.get('/profile/:id', async (req, res) => {
    try {
        await sql.connect(config);
        const request = new sql.Request();
        request.input('uid', sql.Int, req.params.id);
        const result = await request.query(`
            select users.full_name, users.email, loyalty_points.points_earned 
            from users 
            left join loyalty_points on users.user_id = loyalty_points.user_id 
            where users.user_id = @uid
        `);
        res.json(result.recordset);
    } catch (err) { res.status(500).send(err.message); }
});

//login check
app.post('/login', async (req, res) => {
    try {
        await sql.connect(config);
        const request = new sql.Request();
        request.input('email', sql.VarChar, req.body.email);
        const result = await request.query('select user_id, password_hash, role from users where email = @email');
        res.json(result.recordset);
    } catch (err) { res.status(500).send(err.message); }
});

//  Total Items for a Vendor (http://localhost:3000/inventory/total/1)
app.get('/inventory/total/:vid', async (req, res) => {
    try {
        await sql.connect(config);
        const request = new sql.Request();
        
        
        request.input('vid', sql.Int, req.params.vid);
        
        const result = await request.query('select count(item_id) as total_items from inventory where vendor_id = @vid');
        
        
        res.json(result.recordset[0]); 
    } catch (err) {
        res.status(500).send("Error fetching count: " + err.message);
    }
});

//  Total Items Saved (Impact Analytics)(http://localhost:3000/analytics/total-saved)
app.get('/analytics/total-saved', async (req, res) => {
    try {
        await sql.connect(config);
        const result = await sql.query('select sum(quantity_ordered) as total_items_saved from orders');
        
        
        res.json(result.recordset[0]); 
    } catch (err) {
        res.status(500).send("Error calculating total saved: " + err.message);
    }
});
//  Total CO2 Saved (Environmental Impact)(http://localhost:3000/analytics/co2-saved)
app.get('/analytics/co2-saved', async (req, res) => {
    try {
        await sql.connect(config);
        
        
        const result = await sql.query('select sum(quantity_ordered * 2.5) as total_co2_saved_kg from orders');
        
        
        res.json(result.recordset[0]); 
    } catch (err) {
        res.status(500).send("Error calculating CO2 impact: " + err.message);
    }
});

// Revenue Recovered for a Vendor (Financial Analytics)(http://localhost:3000/analytics/revenue/1)
app.get('/analytics/revenue/:vid', async (req, res) => {
    try {
        await sql.connect(config);
        const request = new sql.Request();
        
        
        request.input('vid', sql.Int, req.params.vid);
        
        const result = await request.query(`
            select 
                sum(orders.total_amount) as revenue_recovered 
            from orders 
            join inventory on orders.item_id = inventory.item_id 
            where inventory.vendor_id = @vid 
            and orders.order_type = 'purchase'
        `);
        
        
        res.json(result.recordset[0]); 
    } catch (err) {
        res.status(500).send("Error calculating revenue: " + err.message);
    }
});

//  Completed Donations (NGO Success Metrics)(http://localhost:3000/analytics/completed-donations)
app.get('/analytics/completed-donations', async (req, res) => {
    try {
        await sql.connect(config);
        
        
        const result = await sql.query("select count(*) as completed_donations from claims where claim_status = 'collected'");
        
        
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
            select 
                month(order_date) as month_num, 
                count(*) as total_orders 
            from orders 
            group by month(order_date)
            order by month_num asc
        `);
        
        
        res.json(result.recordset); 
    } catch (err) {
        res.status(500).send("Error fetching monthly trend: " + err.message);
    }
});


app.get('/displaydiscounted',async (req,res)=>
{
    await sql.connect(config);
    const result=await sql.query("select * from inventory where status = 'discounted' and quantity > 0");
    res.json(result.recordset);
});

app.get('/filterbycategory', async (req, res) => {

    await sql.connect(config);
    const { category_name } = req.body;
    const result = await sql.query`
        SELECT inventory.*
        FROM inventory
        JOIN products ON inventory.product_id = products.product_id
        JOIN categories ON products.category_id = categories.category_id
        WHERE categories.category_name = ${category_name}
    `;

    res.json(result.recordset);
});

app.get('/filterbyprice', async (req, res) => {

    await sql.connect(config);

    const { min_price, max_price } = req.body;

    const result = await sql.query`
        SELECT * FROM inventory
        WHERE current_price >= ${min_price}
        AND current_price <= ${max_price}
        AND status = 'discounted'
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

app.get('/orderhistory', async (req, res) => {

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

    await sql.connect(config);

    const { buyer_id, item_id, order_type, quantity_ordered, total_amount } = req.body;

    await sql.query`
        INSERT INTO orders 
        (buyer_id, item_id, order_type, quantity_ordered, total_amount)
        VALUES 
        (${buyer_id}, ${item_id}, ${order_type}, ${quantity_ordered}, ${total_amount})
    `;

    res.send("Order placed successfully");
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

app.get('/filterbyrole', async (req, res) => {

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
        SELECT * FROM inventory
        WHERE quantity = 0
    `);

    res.json(result.recordset);
});

app.post('/addstock', async (req, res) => {

    await sql.connect(config);

    const { product_id, vendor_id, quantity, original_price, current_price, expiry_date } = req.body;

    await sql.query`
        INSERT INTO inventory 
        (product_id, vendor_id, quantity, original_price, current_price, expiry_date)
        VALUES
        (${product_id}, ${vendor_id}, ${quantity}, ${original_price}, ${current_price}, ${expiry_date})
    `;

    res.send("Stock added successfully");
});

app.get('/lowstock', async (req, res) => {

    await sql.connect(config);

    const { vendor_id, threshold } = req.body; // threshold optional, default 10

    const min_qty = threshold || 10;

    const result = await sql.query`
        SELECT product_id, quantity
        FROM inventory
        WHERE quantity < ${min_qty} AND vendor_id = ${vendor_id}
    `;

    res.json(result.recordset);
});

app.get('/expiryreport', async (req, res) => {

    await sql.connect(config);

    const { vendor_id } = req.body;

    const result = await sql.query`
        SELECT item_id, expiry_date, status
        FROM inventory
        WHERE vendor_id = ${vendor_id}
        ORDER BY expiry_date ASC
    `;

    res.json(result.recordset);
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

app.get('/stocksummary', async (req, res) => {

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
        
        // 1. Auto Discount (30% off if expiring within 2 days)
        await sql.query(`
            UPDATE inventory 
            SET status = 'discounted', current_price = original_price * 0.7 
            WHERE expiry_date <= DATEADD(day, 2, GETDATE()) AND status = 'available'
        `);

        // 2. Auto Donate (If expiring within 12 hours)
        await sql.query(`
            UPDATE inventory 
            SET status = 'donated' 
            WHERE expiry_date <= DATEADD(hour, 12, GETDATE()) 
            AND (status = 'available' OR status = 'discounted')
        `);

        // 3. Mark Expired
        await sql.query(`
            UPDATE inventory 
            SET status = 'expired' 
            WHERE expiry_date < GETDATE()
        `);

        // 4. Category Discount (50% off for Category 1)
        await sql.query(`
            UPDATE inventory 
            SET current_price = original_price * 0.5 
            FROM inventory 
            JOIN products ON inventory.product_id = products.product_id 
            WHERE products.category_id = 1
        `);

        console.log("Inventory logic executed successfully.");
    } catch (err) {
        console.error("Database error:", err);
        throw err;
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
        res.status(500).send(err.message);
    }
});

app.post('/claims/create', async (req, res) => {
    try {
        const { item_id, ngo_id } = req.body; 
        await sql.connect(config);
        const request = new sql.Request();
        request.input('item_id', sql.Int, item_id);
        request.input('ngo_id', sql.Int, ngo_id);
        
        await request.query("INSERT INTO claims (item_id, ngo_id, claim_status) VALUES (@item_id, @ngo_id, 'pending')");
        res.status(201).send({ message: "Claim submitted successfully" });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.get('/claims/history/:ngo_id', async (req, res) => {
    try {
        await sql.connect(config);
        const request = new sql.Request();
        request.input('ngo_id', sql.Int, req.params.ngo_id);
        
        const result = await request.query("SELECT * FROM claims WHERE ngo_id = @ngo_id");
        res.json(result.recordset);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.get('/claims/pending/:vendor_id', async (req, res) => {
    try {
        await sql.connect(config);
        const request = new sql.Request();
        request.input('vendor_id', sql.Int, req.params.vendor_id);
        
        const result = await request.query(`
            SELECT c.* FROM claims c
            JOIN inventory i ON c.item_id = i.item_id 
            WHERE i.vendor_id = @vendor_id AND c.claim_status = 'pending'
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.get('/logistics/active', async (req, res) => {
    try {
        await sql.connect(config);
        const result = await sql.query("SELECT * FROM logistics WHERE delivery_status = 'in-transit'");
        res.json(result.recordset);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.get('/notifications/unread/:user_id', async (req, res) => {
    try {
        await sql.connect(config);
        const request = new sql.Request();
        request.input('user_id', sql.Int, req.params.user_id);
        
        const result = await request.query("SELECT * FROM notifications WHERE user_id = @user_id AND is_read = 0");
        res.json(result.recordset);
    } catch (err) {
        res.status(500).send(err.message);
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