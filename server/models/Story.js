import {Schema, model} from "mongoose";

const storySchema = new Schema({
    user: {type: String, ref: 'User', required: true},
    content: {type: String},
    media_url: {type: String},
    media_type: {type: String, enum: ['text', 'image', 'text_with_image']},
    views_count: [{type: String, ref: 'User'}],
    background_color: {type: String},
}, {timestamps: true, minimaze: false})

const Story = model('Story', storySchema);

export default Story;