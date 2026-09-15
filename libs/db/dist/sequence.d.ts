import { Repository } from 'typeorm';
export interface SequenceRow {
    key: string;
    seq: number;
}
export declare function nextSequenceValue<T extends SequenceRow>(repo: Repository<T>, key: string): Promise<number>;
//# sourceMappingURL=sequence.d.ts.map