import type { IProductRepository } from './product.repository.ts';
import { ZetaProductRepository } from './product.zetadb.repository.ts';
import type { IOrderRepository } from './order.repository.ts';
import { ZetaOrderRepository } from './order.zetadb.repository.ts';
import type { IUserProfileRepository } from './user.repository.ts';
import { ZetaUserProfileRepository } from './user.zetadb.repository.ts';
import type { ICartRepository, ICheckoutRepository } from './cart.repository.ts';
import { ZetaCartRepository, ZetaCheckoutRepository } from './cart.zetadb.repository.ts';
import type { ICategoryRepository } from './category.repository.ts';
import { ZetaCategoryRepository } from './category.zetadb.repository.ts';

export class RepositoryFactory {
  private static productRepository: IProductRepository;
  private static orderRepository: IOrderRepository;
  private static userProfileRepository: IUserProfileRepository;
  private static cartRepository: ICartRepository;
  private static checkoutRepository: ICheckoutRepository;
  private static categoryRepository: ICategoryRepository;

  static getProductRepository(): IProductRepository {
    if (this.productRepository) return this.productRepository;

    const dbType = process.env.DATABASE_TYPE || 'zetadb';

    if (dbType === 'zetadb') {
      this.productRepository = new ZetaProductRepository();
    } else {
      this.productRepository = new ZetaProductRepository();
    }

    return this.productRepository;
  }

  static getCategoryRepository(): ICategoryRepository {
    if (this.categoryRepository) return this.categoryRepository;
    this.categoryRepository = new ZetaCategoryRepository();
    return this.categoryRepository;
  }

  static getOrderRepository(): IOrderRepository {
    if (this.orderRepository) return this.orderRepository;

    const dbType = process.env.DATABASE_TYPE || 'zetadb';

    if (dbType === 'zetadb') {
      this.orderRepository = new ZetaOrderRepository();
    } else {
      this.orderRepository = new ZetaOrderRepository();
    }

    return this.orderRepository;
  }

  static getUserProfileRepository(): IUserProfileRepository {
    if (this.userProfileRepository) return this.userProfileRepository;

    const dbType = process.env.DATABASE_TYPE || 'zetadb';

    if (dbType === 'zetadb') {
      this.userProfileRepository = new ZetaUserProfileRepository();
    } else {
      this.userProfileRepository = new ZetaUserProfileRepository();
    }

    return this.userProfileRepository;
  }

  static getCartRepository(): ICartRepository {
    if (this.cartRepository) return this.cartRepository;
    this.cartRepository = new ZetaCartRepository();
    return this.cartRepository;
  }

  static getCheckoutRepository(): ICheckoutRepository {
    if (this.checkoutRepository) return this.checkoutRepository;
    this.checkoutRepository = new ZetaCheckoutRepository();
    return this.checkoutRepository;
  }
}


