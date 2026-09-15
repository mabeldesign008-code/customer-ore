"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderSequence = void 0;
const typeorm_1 = require("typeorm");
const db_1 = require("@ore/db");
/** Per (city, service, date) counter for visible order refs (doc §Order ID). Key: `CC-FO-20260810`. */
let OrderSequence = class OrderSequence extends db_1.SequenceCounter {
};
exports.OrderSequence = OrderSequence;
exports.OrderSequence = OrderSequence = __decorate([
    (0, typeorm_1.Entity)({ schema: 'order' })
], OrderSequence);
//# sourceMappingURL=order-sequence.entity.js.map