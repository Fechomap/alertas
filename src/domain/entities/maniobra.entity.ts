export interface ManiobraProps {
  id: string;
  groupId: string;
  userId: string;
  cantidad: number;
  descripcion: string;
  fecha: Date;
  createdAt: Date;
}

export class Maniobra {
  private constructor(private readonly props: ManiobraProps) {}

  static create(props: ManiobraProps): Maniobra {
    return new Maniobra(props);
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

  get cantidad(): number {
    return this.props.cantidad;
  }

  get descripcion(): string {
    return this.props.descripcion;
  }

  get fecha(): Date {
    return this.props.fecha;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
