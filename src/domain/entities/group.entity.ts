export interface GroupProps {
  id: string;
  chatId: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class Group {
  private constructor(private readonly props: GroupProps) {}

  static create(props: GroupProps): Group {
    return new Group(props);
  }

  get id(): string {
    return this.props.id;
  }

  get chatId(): string {
    return this.props.chatId;
  }

  get name(): string {
    return this.props.name;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
