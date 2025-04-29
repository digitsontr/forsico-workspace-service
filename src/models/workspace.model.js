const mongoose = require('mongoose');

const WorkspaceProgressState = {
  INITIAL: 'INITIAL',
  WAITING_TASKS: 'WAITING_TASKS',
  TASKS_CREATED: 'TASKS_CREATED',
  IN_PROGRESS: 'IN_PROGRESS',
  ON_HOLD: 'ON_HOLD',
  COMPLETED: 'COMPLETED'
};

const workspaceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  owner: [{
    type: String,
    required: true
  }],
  members: [{
    type: String
  }],
  memberRoles: {
    type: Map,
    of: String
  },
  settings: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  progress: {
    state: {
      type: String,
      enum: Object.values(WorkspaceProgressState),
      default: WorkspaceProgressState.INITIAL
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    },
    history: [{
      state: String,
      timestamp: Date,
      updatedBy: String,
      comment: String
    }]
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  },
  deletionId: {
    type: String
  },
  subscriptionId: {
    type: String,
    required: true,
    index: true
  },
  createdBy: {
    type: String,
    required: true
  },
  updatedBy: {
    type: String
  }
}, {
  timestamps: true,
  versionKey: false
});

// Progress state changes middleware
workspaceSchema.pre('save', function(next) {
  if (this.isModified('progress.state')) {
    const historyEntry = {
      state: this.progress.state,
      timestamp: new Date(),
      updatedBy: this.updatedBy || this.createdBy,
      comment: this._progressStateComment || ''
    };
    
    this.progress.lastUpdated = historyEntry.timestamp;
    this.progress.history = this.progress.history || [];
    this.progress.history.push(historyEntry);
    
    // Clear the temporary comment
    delete this._progressStateComment;
  }
  next();
});

// Soft delete middleware
workspaceSchema.pre('save', function(next) {
  if (this.isModified('isDeleted') && this.isDeleted) {
    this.deletedAt = new Date();
    this.deletionId = require('crypto').randomBytes(16).toString('hex');
  }
  next();
});

// Indexes
workspaceSchema.index({ name: 1, tenantId: 1 }, { unique: true });
workspaceSchema.index({ owner: 1 });
workspaceSchema.index({ members: 1 });
workspaceSchema.index({ isDeleted: 1 });
workspaceSchema.index({ createdAt: -1 });

// Instance method to add progress state comment
workspaceSchema.methods.setProgressStateComment = function(comment) {
  this._progressStateComment = comment;
};

const WorkspaceModel = mongoose.model('Workspace', workspaceSchema);

module.exports = {
  WorkspaceModel,
  WorkspaceProgressState
}; 