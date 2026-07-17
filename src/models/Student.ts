
import mongoose, { Schema, Document, model, models } from 'mongoose';

export interface IStudent extends Document {
  studentId: string;
  name: string;
  contactNumber: string;
  seatNumber: number;
  joinDate: Date;
  renewalDate: Date;
  paymentStatus: 'Paid' | 'Pending';
  paymentMethod: 'Cash' | 'UPI' | 'Bank Transfer';
  shift: 'Day' | 'Night' | 'Day & Night';
  price: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const StudentSchema = new Schema<IStudent>(
  {
    studentId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true
    },
    name: { 
      type: String, 
      required: [true, 'Student name is required'],
      trim: true 
    },
    contactNumber: { 
      type: String, 
      required: [true, 'Contact number is required'],
      trim: true,
      validate: {
        validator: function(v: string) {
          return /^\d{10}$/.test(v);
        },
        message: props => `${props.value} is not a valid 10-digit mobile number!`
      }
    },
    seatNumber: { 
      type: Number, 
      required: [true, 'Seat number is required'],
      min: [1, 'Seat number must be at least 1'], 
      max: [150, 'Seat number cannot exceed 150'] 
    },
    joinDate: { 
      type: Date, 
      required: true, 
      default: Date.now 
    },
    renewalDate: { 
      type: Date, 
      required: true, 
      default: function(this: IStudent) {
        const date = new Date(this.joinDate || Date.now());
        date.setDate(date.getDate() + 30);
        return date;
      }
    },
    paymentStatus: { 
      type: String, 
      enum: ['Paid', 'Pending'], 
      required: true,
      default: 'Pending'
    },
    paymentMethod: { 
      type: String, 
      enum: ['Cash', 'UPI', 'Bank Transfer'], 
      required: true,
      default: 'UPI'
    },
    shift: {
      type: String,
      enum: ['Day', 'Night', 'Day & Night'],
      required: true,
      default: 'Day'
    },
    price: {
      type: Number,
      required: true,
      default: 500
    },
    isActive: { 
      type: Boolean, 
      default: true 
    }
  },
  { 
    timestamps: true 
  }
);

export default models.Student || model<IStudent>('Student', StudentSchema);
