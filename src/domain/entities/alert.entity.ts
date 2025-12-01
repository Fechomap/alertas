import type { AlertType } from '../value-objects/alert-type.vo.js';

export interface AlertProps {
  id: string;
  groupId: string;
  userId: string;
  type: AlertType;
  message: string;
  isPending: boolean;
  startedAt: Date;
  stoppedAt: Date | null;
  createdAt: Date;
}

export class Alert {
  private constructor(private readonly props: AlertProps) {}

  static create(props: AlertProps): Alert {
    return new Alert(props);
  }

  get id(): string {
    return this.props.id;
  }

  get groupId(): string {
    return this.props.groupId;
  }

  get userId(): string {
    return this.props.userId;
  }

  get type(): AlertType {
    return this.props.type;
  }

  get message(): string {
    return this.props.message;
  }

  get isPending(): boolean {
    return this.props.isPending;
  }

  get startedAt(): Date {
    return this.props.startedAt;
  }

  get stoppedAt(): Date | null {
    return this.props.stoppedAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  isActive(): boolean {
    return this.props.stoppedAt === null;
  }

  getDurationMs(): number {
    const endTime = this.props.stoppedAt ?? new Date();
    return endTime.getTime() - this.props.startedAt.getTime();
  }
}
