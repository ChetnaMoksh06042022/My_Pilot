const express = require("express");
const app = express();
const path = require("path");
const multer = require('multer');
const fs = require('fs');
const mongoose = require('mongoose');
const PilotInfo = require('./data'); // Adjust path as needed

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/mydatabase')
        .then(() => console.log('Connected to MongoDB'))
        .catch(err => console.error('MongoDB connection error:', err));

// Configure multer for file uploads
const storage = multer.diskStorage({
        destination: function (req, file, cb) {
                // Store in images folder
                const uploadDir = path.join(__dirname, 'public', 'images');
                if (!fs.existsSync(uploadDir)) {
                        fs.mkdirSync(uploadDir, { recursive: true });
                }
                cb(null, uploadDir);
        },
        filename: function (req, file, cb) {
                // Generate unique filename using date
                const uniqueSuffix = Date.now() + path.extname(file.originalname);
                cb(null, uniqueSuffix);
        }
});

const upload = multer({
        storage: storage,
        limits: {
                fileSize: 5 * 1024 * 1024 // 5MB limit
        },
        fileFilter: function (req, file, cb) {
                // Accept only image files
                if (!file.originalname.match(/\.(jpg|jpeg|png|webp)$/)) {
                        return cb(new Error('Only image files are allowed!'));
                }
                cb(null, true);
        }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", 'ejs');
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.get("/", async function (req, res) {
        try {
                const flights = await PilotInfo.find().sort({ date: -1 });
                console.log('Retrieved flights:', flights); // Add this debug line
                res.render("index", { flights });
        } catch (error) {
                console.error('Error fetching flights:', error);
                res.status(500).send('Error fetching flights');
        }
});

app.post("/create-post", upload.single('image'), async function (req, res) {
        try {
                const newFlight = new PilotInfo({
                        img: req.file ? `/images/${req.file.filename}` : null,
                        number: req.body.flightNumber,
                        date: req.body.date,
                        description: req.body.description
                });

                await newFlight.save();
                res.redirect("/");
        } catch (error) {
                console.error('Error creating post:', error);
                res.status(500).send('Error creating post');
        }
});

// Delete flight route
app.delete("/flights/:id", async function (req, res) {
        try {
                const flight = await PilotInfo.findById(req.params.id);

                // Delete image if exists
                if (flight.img) {
                        const imagePath = path.join(__dirname, 'public', flight.img);
                        if (fs.existsSync(imagePath)) {
                                fs.unlinkSync(imagePath);
                        }
                }

                await PilotInfo.findByIdAndDelete(req.params.id);
                res.json({ success: true });
        } catch (error) {
                console.error('Error deleting flight:', error);
                res.status(500).json({ success: false, error: 'Error deleting flight' });
        }
});

// Update flight route
app.put("/flights/:id", upload.single('image'), async function (req, res) {
        try {
                const flight = await PilotInfo.findById(req.params.id);

                // Update data
                const updateData = {
                        number: req.body.flightNumber,
                        date: req.body.date,
                        description: req.body.description
                };

                // Handle image update
                if (req.file) {
                        // Delete old image if exists
                        if (flight.img) {
                                const oldImagePath = path.join(__dirname, 'public', flight.img);
                                if (fs.existsSync(oldImagePath)) {
                                        fs.unlinkSync(oldImagePath);
                                }
                        }
                        updateData.img = `/images/${req.file.filename}`;
                }

                const updatedFlight = await PilotInfo.findByIdAndUpdate(
                        req.params.id,
                        updateData,
                        { new: true }
                );

                res.json({ success: true, flight: updatedFlight });
        } catch (error) {
                console.error('Error updating flight:', error);
                res.status(500).json({ success: false, error: 'Error updating flight' });
        }
});

// Error handling middleware
app.use((err, req, res, next) => {
        console.error(err.stack);
        res.status(500).send('Something broke!');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
});