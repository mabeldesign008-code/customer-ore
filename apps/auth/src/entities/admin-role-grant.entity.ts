import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * A single permission granted to, or taken away from, one admin on top of their role.
 *
 * `deny` exists so you can subtract one permission without forking a whole new role —
 * the usual real case is "everyone in finance except Kwame can release reserves".
 *
 * Denials win over grants, and both win over the role matrix. `PermissionGuard.holds()`
 * applies them in that order.
 */
@Entity({ schema: 'auth' })
@Index(['adminUserId', 'permission'], { unique: true })
export class AdminRoleGrant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  adminUserId: string;

  @Column({ type: 'varchar' })
  permission: string;

  /** grant | deny */
  @Column({ type: 'varchar', default: 'grant' })
  mode: string;

  @Column({ type: 'varchar', nullable: true })
  grantedBy: string | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
