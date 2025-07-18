const mongoose = require("mongoose");

const WorkspaceProgressState = {
  INITIAL: "INITIAL",
  WAITING_TASKS: "WAITING_TASKS",
  TASKS_CREATED: "TASKS_CREATED",
  COMPLETED: "COMPLETED",
};

const workspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    subscriptionId: {
      type: String,
      required: true,
      index: true,
    },
    owner: {
      type: String,
      required: true,
    },
    members: [
      {
        type: String,
      },
    ],
    settings: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
    progress: {
      state: {
        type: String,
        enum: Object.values(WorkspaceProgressState),
        default: WorkspaceProgressState.INITIAL,
      },
      lastUpdated: {
        type: Date,
        default: Date.now,
      },
      history: [
        {
          state: String,
          timestamp: Date,
          updatedBy: String,
          comment: String,
        },
      ],
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
    deletionId: {
      type: String,
    }
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

workspaceSchema.pre("save", function (next) {
  if (this.isModified("progress.state")) {
    const historyEntry = {
      state: this.progress.state,
      timestamp: new Date(),
      updatedBy: this.updatedBy || this.createdBy,
      comment: this._progressStateComment || "",
    };

    this.progress.lastUpdated = historyEntry.timestamp;
    this.progress.history = this.progress.history || [];
    this.progress.history.push(historyEntry);

    delete this._progressStateComment;
  }
  next();
});

workspaceSchema.pre("save", function (next) {
  if (this.isModified("isDeleted") && this.isDeleted) {
    this.deletedAt = new Date();
    this.deletionId = require("crypto").randomBytes(16).toString("hex");
  }
  next();
});

workspaceSchema.index({ name: 1, subscriptionId: 1 }, { unique: true });
workspaceSchema.index({ owner: 1 });
workspaceSchema.index({ members: 1 });
workspaceSchema.index({ isDeleted: 1 });
workspaceSchema.index({ createdAt: -1 });

workspaceSchema.methods.setProgressStateComment = function (comment) {
  this._progressStateComment = comment;
};

const WorkspaceModel = mongoose.model("Workspace", workspaceSchema);

module.exports = {
  WorkspaceModel,
  WorkspaceProgressState,
};
