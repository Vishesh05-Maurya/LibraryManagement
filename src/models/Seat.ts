import mongoose, { Schema, Document, model, models, Types } from 'mongoose';

export interface ISeat extends Document {
  seatNumber: number;
  status: 'Available' | 'Occupied' | 'Maintenance';
  currentStudentId: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const SeatSchema = new Schema<ISeat>(
  {
    seatNumber: { 
      type: Number, 
      required: true, 
      unique: true, 
      min: 1, 
      max: 150,
      immutable: true
    },
    status: { 
      type: String, 
      enum: ['Available', 'Occupied', 'Maintenance'], 
      required: true,
      default: 'Available'
    },
    currentStudentId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Student', 
      default: null 
    }
  },
  { 
    timestamps: true 
  }
);

export default models.Seat || model<ISeat>('Seat', SeatSchema);
