import { Model, Document, FilterQuery, UpdateQuery, PopulateOptions, Query, ClientSession } from 'mongoose';
import dbConnect from '../lib/dbConnect';

interface QueryOptions {
  sort?: Record<string, 1 | -1>;
  limit?: number;
  skip?: number;
  populate?: PopulateOptions | PopulateOptions[];
  select?: string | Record<string, 0 | 1>;
  lean?: boolean;
  new?: boolean;
  runValidators?: boolean;
  session?: ClientSession;
}

export abstract class BaseService<T extends Document> {
  constructor(protected readonly model: Model<T>) {}

  protected async ensureConnection() {
    await dbConnect();
  }

  protected buildQuery<Q extends Query<any, any>>(
    query: Q,
    options: QueryOptions
  ): Q {
    const { sort, limit, skip, populate, select, lean, session } = options;

    if (session) {
      query = query.session(session) as Q;
    }

    if (sort) {
      query = query.sort(sort) as Q;
    }
    if (limit) {
      query = query.limit(limit) as Q;
    }
    if (skip) {
      query = query.skip(skip) as Q;
    }
    if (populate) {
      if (Array.isArray(populate)) {
        populate.forEach(p => {
          query = query.populate(p) as Q;
        });
      } else {
        query = query.populate(populate) as Q;
      }
    }
    if (select) {
      query = query.select(select) as Q;
    }
    if (lean) {
      query = query.lean() as Q;
    }

    return query;
  }

  async startSession(): Promise<ClientSession> {
    await this.ensureConnection();
    return this.model.db.startSession();
  }

  async withTransaction<R>(callback: (session: ClientSession) => Promise<R>): Promise<R> {
    const session = await this.startSession();
    try {
      let result: R;
      await session.withTransaction(async () => {
        result = await callback(session);
      });
      return result!;
    } finally {
      await session.endSession();
    }
  }

  async find(filter: FilterQuery<T> = {}, options: QueryOptions = {}): Promise<T[]> {
    await this.ensureConnection();
    const query = this.buildQuery(
      this.model.find(filter),
      { sort: { createdAt: -1 }, ...options }
    );
    return query.exec();
  }

  async findById(id: string, options: QueryOptions = {}): Promise<T | null> {
    await this.ensureConnection();
    const query = this.buildQuery(this.model.findById(id), options);
    return query.exec();
  }

  async findOne(filter: FilterQuery<T> = {}, options: QueryOptions = {}): Promise<T | null> {
    await this.ensureConnection();
    const query = this.buildQuery(this.model.findOne(filter), options);
    return query.exec();
  }

  async create(data: Partial<T>, options?: QueryOptions): Promise<T> {
    await this.ensureConnection();
    if (options?.session) {
      return this.model.create([data], { session: options.session }).then(docs => docs[0]);
    }
    const doc = new this.model(data);
    return doc.save(options);
  }

  async update(
    id: string, 
    update: UpdateQuery<T>, 
    options: QueryOptions = {}
  ): Promise<T | null> {
    await this.ensureConnection();
    const { new: returnNew = true, runValidators = true } = options;
    const query = this.model.findByIdAndUpdate(id, update, {
      new: returnNew,
      runValidators,
      session: options.session,
      ...options
    });
    return query.exec();
  }

  async delete(id: string, options: QueryOptions = {}): Promise<T | null> {
    await this.ensureConnection();
    return this.model.findByIdAndDelete(id)
      .session(options.session || null)
      .exec();
  }

  async count(filter: FilterQuery<T> = {}, options: QueryOptions = {}): Promise<number> {
    await this.ensureConnection();
    return this.model.countDocuments(filter)
      .session(options.session || null)
      .exec();
  }

  async exists(filter: FilterQuery<T>, options: QueryOptions = {}): Promise<boolean> {
    await this.ensureConnection();
    const count = await this.model.countDocuments(filter)
      .limit(1)
      .session(options.session || null)
      .exec();
    return count > 0;
  }

  async findWithPagination(
    filter: FilterQuery<T> = {},
    page = 1,
    limit = 10,
    options: QueryOptions = {}
  ) {
    await this.ensureConnection();
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.find(filter, { ...options, skip, limit }),
      this.count(filter, options),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + items.length < total,
    };
  }

  async bulkCreate(dataArray: Partial<T>[], options: QueryOptions = {}): Promise<T[]> {
    await this.ensureConnection();
    return this.model.create(dataArray, { session: options.session });
  }

  async bulkUpdate(
    filter: FilterQuery<T>, 
    update: UpdateQuery<T>, 
    options: QueryOptions = {}
  ): Promise<number> {
    await this.ensureConnection();
    const result = await this.model.updateMany(filter, update)
      .session(options.session || null)
      .exec();
    return result.modifiedCount;
  }

  async bulkDelete(filter: FilterQuery<T>, options: QueryOptions = {}): Promise<number> {
    await this.ensureConnection();
    const result = await this.model.deleteMany(filter)
      .session(options.session || null)
      .exec();
    return result.deletedCount;
  }

  async aggregate(pipeline: any[], options: QueryOptions = {}): Promise<any[]> {
    await this.ensureConnection();
    return this.model.aggregate(pipeline)
      .session(options.session || null)
      .exec();
  }
}
