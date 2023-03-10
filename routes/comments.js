var express = require('express');
var router = express.Router();
const Comment = require('./../models/comment_model');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Checks if JWT sent to the server is correct
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) {
        return res.sendStatus(401);
    }

    jwt.verify(token, process.env.SECRET_ACCESS_KEY, (err, user) => {
        if (err) {
            return res.sendStatus(403);
        }
        req.user = user;
        next();
    });    
}

// -----------------------------------------------------------------------------------------------------

//GET routes
router.get('/:id', (req, res, next) => {
    Comment.find({commentID: req.params.id})
    .exec(function(err, comment) {
        if (err) {
            return next(err);
        }
        res.json({comment: comment, postID: comment[0].postID});
    })
})

// -----------------------------------------------------------------------------------------------------

// POST routes
router.post('/new', authenticateToken, (req, res) => {
    const comment = new Comment({
        postID: req.body.postID,
        commentID: crypto.randomBytes(16).toString('hex'),
        content: req.body.content,
        username: req.user.name,
        date: new Date(),
        likes: 0,
        liked_by: []
    })
    comment.save((err) => {
        if (err) {
            return next(err);
        }
        res.json({message: 'Success'});
    })
})

router.post('/likes', authenticateToken, (req, res) => {
    if (req.body.info === 'Like') {
        Comment.findOneAndUpdate({commentID: req.body.id}, {$inc: { likes: +1 }, $push: { liked_by: req.user.name }}, (err) => {
            if (err) {
                return next(err);
            }
            res.json({message: 'Success'});
        });
    } else if (req.body.info === 'Dislike') {
        Comment.findOneAndUpdate({commentID: req.body.id}, {$inc: { likes: -1 }, $pull: { liked_by: req.user.name }}, (err) => {
            if (err) {
                return next(err);
            }
            res.json({message: 'Success'});
        });
    } else {
        res.json({error: 'Unknown request'});
    }
})

router.post('/edit', authenticateToken, (req, res, next) => {
    Comment.findOneAndUpdate({commentID: req.body.commentID}, {$set: {
        title: req.body.title,
        content: req.body.content
    }}, (err) => {
        if (err) {
            return next(err);
        }
        res.json({message: 'Success'});
    })
})

router.post('/delete', authenticateToken, (req, res, next) => {
    Comment.find({commentID: req.body.commentID}, (err, comment) => {
        if (err) {
            return next(err);
        }

        // Simple security check to verify whether the user deleting the comment is the one who created it
        if (req.user.name === comment[0].username) {
            Comment.findOneAndDelete({commentID: req.body.commentID}, (err) => {
                if (err) {
                    return next(err);
                }
                res.json({message: 'Success'});
            })
        }
    })
})

module.exports = router;