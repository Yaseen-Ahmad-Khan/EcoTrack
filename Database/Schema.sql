create database ecotrack
use ecotrack

go



--  users table
create table users (
    user_id int primary key identity(1,1),
    full_name varchar(100) not null,
    email varchar(100) unique not null,
    password_hash varchar(255) not null,
    role varchar(20) not null check (role in ('vendor', 'customer', 'ngo')),
    phone_number varchar(15),
    address text,
    created_at datetime default getdate()
);

--  categories table
create table categories (
    category_id int primary key identity(1,1),
    category_name varchar(50) not null unique
);

--  products table
create table products (
    product_id int primary key identity(1,1),
    category_id int,
    product_name varchar(100) not null,
    description text,
    foreign key (category_id) references categories(category_id) 
        on delete set null
);

--  inventory table
create table inventory (
    item_id int primary key identity(1,1),
    product_id int not null,
    vendor_id int not null,
    quantity int not null check (quantity >= 0),
    original_price decimal(10, 2) not null check (original_price > 0),
    current_price decimal(10, 2) not null check (current_price > 0),
    expiry_date date not null,
    status varchar(20) default 'available' check (status in ('available', 'discounted', 'donated', 'expired')),
    last_updated datetime default getdate(),
    constraint chk_price check (current_price <= original_price),
    constraint fk_product foreign key (product_id) references products(product_id) on delete cascade,
    constraint fk_vendor foreign key (vendor_id) references users(user_id) on delete no action
);

--  orders table
create table orders (
    order_id int primary key identity(1,1),
    buyer_id int not null,
    item_id int not null,
    order_type varchar(20) not null check (order_type in ('purchase', 'donation')),
    quantity_ordered int not null check (quantity_ordered > 0),
    total_amount decimal(10, 2) default 0.00 check (total_amount >= 0),
    order_date datetime default getdate(),
    foreign key (buyer_id) references users(user_id) on delete no action,
    foreign key (item_id) references inventory(item_id) on delete cascade
);

--  claims table
create table claims (
    claim_id int primary key identity(1,1),
    item_id int not null,
    ngo_id int not null,
    claim_status varchar(20) default 'pending' check (claim_status in ('pending', 'approved', 'collected', 'cancelled')),
    quantity_claimed int default 1 check (quantity_claimed > 0),
    claim_date datetime default getdate(),
    foreign key (item_id) references inventory(item_id) on delete cascade,
    foreign key (ngo_id) references users(user_id) on delete no action
);
--  reviews table
create table reviews (
    review_id int primary key identity(1,1),
    vendor_id int not null,
    reviewer_id int not null,
    rating int check (rating between 1 and 5),
    comment text,
    review_date datetime default getdate(),
    foreign key (vendor_id) references users(user_id) on delete no action,
    foreign key (reviewer_id) references users(user_id) on delete no action
);

--  notifications table
create table notifications (
    notification_id int primary key identity(1,1),
    user_id int not null,
    message text not null,
    is_read bit default 0,
    created_at datetime default getdate(),
    foreign key (user_id) references users(user_id) on delete cascade
);

--  logistics table
create table logistics (
    delivery_id int primary key identity(1,1),
    order_id int not null,
    delivery_status varchar(20) default 'pending' check (delivery_status in ('pending', 'in-transit', 'delivered', 'failed')),
    delivery_person_name varchar(100),
    estimated_arrival datetime,
    actual_arrival datetime,
    foreign key (order_id) references orders(order_id) on delete cascade
);

--  payments table
create table payments (
    payment_id int primary key identity(1,1),
    order_id int not null,
    payment_method varchar(20) check (payment_method in ('cash', 'card', 'wallet')),
    payment_status varchar(20) default 'pending' check (payment_status in ('pending', 'completed', 'refunded')),
    transaction_id varchar(100) unique,
    amount_paid decimal(10, 2) not null check (amount_paid >= 0),
    payment_date datetime default getdate(),
    foreign key (order_id) references orders(order_id) on delete cascade
);

--  loyalty_points table
create table loyalty_points (
    reward_id int primary key identity(1,1),
    user_id int not null,
    points_earned int default 0 check (points_earned >= 0),
    last_updated datetime default getdate(),
    foreign key (user_id) references users(user_id) on delete cascade
);

insert into categories (category_name) values
('Bakery'),
('Dairy'),
('Beverages'),
('Fruits & Vegetables'),
('Packed Food');

insert into users (full_name, email, password_hash, role, phone_number, address)
values
('Ahmed Raza', 'ahmed@lahorebakes.pk', 'hashed123', 'vendor', '03001234567', 'Model Town, Lahore'),
('Fatima Khan', 'fatima@student.com', 'hashed456', 'customer', '03111234567', 'Johar Town, Lahore'),
('Helping Hands Foundation', 'ngo@helpinghands.pk', 'hashed789', 'ngo', '03211234567', 'Gulshan-e-Iqbal, Karachi');

insert into products (category_id, product_name, description)
values
(1, 'Chicken Patties', 'Freshly baked chicken patties'),
(1, 'Cream Rolls', 'Soft cream-filled rolls'),
(2, 'Milk 1L', 'Fresh dairy milk'),
(4, 'Bananas (Dozen)', 'Farm fresh bananas'),
(5, 'Biscuits Pack', 'Chocolate cream biscuits');

insert into inventory 
(product_id, vendor_id, quantity, original_price, current_price, expiry_date, status)
values
(1, 1, 20, 120.00, 100.00, '2026-03-05', 'available'),
(2, 1, 15, 80.00, 60.00, '2026-03-04', 'discounted'),
(3, 1, 30, 220.00, 220.00, '2026-03-06', 'available'),
(4, 1, 10, 150.00, 120.00, '2026-03-03', 'discounted'),
(5, 1, 25, 50.00, 50.00, '2026-04-01', 'available');

insert into orders (buyer_id, item_id, order_type, quantity_ordered, total_amount)
values
(2, 2, 'purchase', 3, 180.00);

insert into payments 
(order_id, payment_method, payment_status, transaction_id, amount_paid)
values
(1, 'card', 'completed', 'TXN12345PK', 180.00);

insert into logistics 
(order_id, delivery_status, delivery_person_name, estimated_arrival)
values
(1, 'in-transit', 'Bilal Ahmed', '2026-03-04 18:00:00');

insert into claims (item_id, ngo_id, claim_status)
values
(4, 3, 'approved');

insert into reviews (vendor_id, reviewer_id, rating, comment)
values
(1, 2, 5, 'Very fresh bakery items and affordable prices!');

insert into notifications (user_id, message)
values
(3, 'New discounted items available near expiry in Lahore.');

insert into loyalty_points (user_id, points_earned)
values
(2, 50);

select * from categories;
select * from users;
select * from products;
select * from inventory;
select * from orders;
select * from payments;
select * from logistics;
select * from claims;
select * from reviews;
select * from notifications;
select * from loyalty_points;

---- User auth

-- Register user
insert into users (full_name, email, password_hash, role, phone_number, address) 
values ('Muhammad Ali', 'ali@email.com', 'hashed_pass', 'customer', '0300-1234567', 'Lahore');

-- Get profile
select users.full_name, users.email, loyalty_points.points_earned 
from users 
left join loyalty_points on users.user_id = loyalty_points.user_id 
where users.user_id = 1;

-- Login check
select user_id, password_hash, role from users where email = 'ali@email.com';


-- Vendor dashboard

-- Total items
select count(item_id) as total_items from inventory where vendor_id = 1;


---- Inventory management

-- Add stock
insert into inventory (product_id, vendor_id, quantity, original_price, current_price, expiry_date) 
values (1, 1, 100, 500.00, 500.00, '2026-04-01');

-- Low stock
select product_id, quantity from inventory where quantity < 10 and vendor_id = 1;

-- Expiry report
select item_id, expiry_date, status from inventory where vendor_id = 1 order by expiry_date asc;

-- Update price
update inventory set current_price = 200.00, last_updated = getdate() where item_id = 1;

-- Stock summary
select status, count(*) as count_per_status from inventory where vendor_id = 1 group by status;


-- Auto logic

-- Auto discount
update inventory set status = 'discounted', current_price = original_price * 0.7 
where expiry_date <= dateadd(day, 2, getdate()) and status = 'available';

-- Auto donate
update inventory set status = 'donated' 
where expiry_date <= dateadd(hour, 12, getdate()) and (status = 'available' or status = 'discounted');

-- Mark expired
update inventory set status = 'expired' where expiry_date < getdate();

-- Category discount
update inventory set current_price = original_price * 0.5 
from inventory join products on inventory.product_id = products.product_id 
where products.category_id = 1;


----- Marketplace 

-- Discounted items
select * from inventory where status = 'discounted' and quantity > 0;

-- Filter by category
select inventory.* from inventory 
join products on inventory.product_id = products.product_id 
join categories on products.category_id = categories.category_id 
where categories.category_name = 'Dairy';

-- Filter by price
select * from inventory where current_price >= 50.00 and current_price <= 200.00 and status = 'discounted';

-- Top vendors
select u.full_name,avg(r.rating) as AVERAGERATING from users u
inner join reviews r on r.vendor_id=u.user_id
group by u.full_name,u.user_id
order by avg(r.rating) desc;

-- Order history
select * from orders where buyer_id = 2 order by order_date desc;

-- Place order
insert into orders (buyer_id, item_id, order_type, quantity_ordered, total_amount)
values
(2, 2, 'purchase', 3, 180.00);


-- Donations

-- Donated items
select * from inventory where status = 'donated' and quantity > 0;

-- Claim item
insert into claims (item_id, ngo_id, claim_status) values (5, 3, 'pending');

-- Claim history
select * from claims where ngo_id = 3;

-- Pending claims
select claims.* from claims 
join inventory on claims.item_id = inventory.item_id 
where inventory.vendor_id = 1 and claims.claim_status = 'pending';


-- Analytics

-- Total saved
select sum(quantity_ordered) as total_items_saved from orders;

-- CO2 saved
select sum(quantity_ordered * 2.5) as total_co2_saved_kg from orders;

-- Vendor revenue
select 
    sum(orders.total_amount) as revenue_recovered 
from orders 
join inventory on orders.item_id = inventory.item_id 
where inventory.vendor_id = 1 
and orders.order_type = 'purchase';

-- Completed donations
select count(*) as completed_donations from claims where claim_status = 'collected';

-- Monthly orders
select month(order_date) as month_num, count(*) as total_orders from orders group by month(order_date);


-- Logistic

-- Active deliveries
select * from logistics where delivery_status = 'in-transit';

-- Unread notifications
select * from notifications where user_id = 1 and is_read = 0;

-- Delivery rate
select (count(case when delivery_status = 'delivered' then 1 end) * 100.0 / count(*)) as success_rate 
from logistics;


-- User updates 

-- Update phone
update users set phone_number='81745839' where user_id=1;

-- Update email
update users set email='jkldajwk@kl.com' where user_id=1;

-- Update password
update users set password_hash='mnvfjd' where user_id=1;


-- Delete user
delete from users where user_id=1;


-- Admin filter
select * from users
where role='customer';


-- Out of stock
select * from inventory
where quantity=0;