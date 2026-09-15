"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddSelectedOptionsToCart1760000000005 = void 0;
const typeorm_1 = require("typeorm");
/** Stores selected catalogue variants and their per-unit price adjustment in cart lines. */
class AddSelectedOptionsToCart1760000000005 {
    name = 'AddSelectedOptionsToCart1760000000005';
    async up(queryRunner) {
        const tablePath = 'cart.cart_item';
        if (!(await queryRunner.hasTable(tablePath)))
            throw new Error(`${tablePath} does not exist`);
        if (!(await queryRunner.hasColumn(tablePath, 'selectedOptions'))) {
            await queryRunner.addColumn(tablePath, new typeorm_1.TableColumn({ name: 'selectedOptions', type: 'text', default: "'[]'" }));
        }
        if (!(await queryRunner.hasColumn(tablePath, 'optionsTotalPesewas'))) {
            await queryRunner.addColumn(tablePath, new typeorm_1.TableColumn({ name: 'optionsTotalPesewas', type: 'int', default: 0 }));
        }
    }
    async down(queryRunner) {
        const tablePath = 'cart.cart_item';
        if (!(await queryRunner.hasTable(tablePath)))
            return;
        if (await queryRunner.hasColumn(tablePath, 'optionsTotalPesewas'))
            await queryRunner.dropColumn(tablePath, 'optionsTotalPesewas');
        if (await queryRunner.hasColumn(tablePath, 'selectedOptions'))
            await queryRunner.dropColumn(tablePath, 'selectedOptions');
    }
}
exports.AddSelectedOptionsToCart1760000000005 = AddSelectedOptionsToCart1760000000005;
//# sourceMappingURL=1760000000005-AddSelectedOptionsToCart.js.map