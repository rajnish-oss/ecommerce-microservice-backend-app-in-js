import express, { Request, Response } from 'express';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';

const packageDefinition = protoLoader.loadSync(
  path.resolve(process.cwd(), '../proto/productCat.proto'),
  {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  }
);

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
const ProductCatalogServiceClient = protoDescriptor.productcatalog.ProductCatalogService;

const client = new ProductCatalogServiceClient(
  process.env.PRODUCTCAT_SERVICE_URL ?? 'prodcatalog_service:50056',
  grpc.credentials.createInsecure()
);

const router = express.Router();

function unaryCall(method: string, payload: any) {
  return new Promise((resolve, reject) => {
    client[method](payload, (err: any, response: any) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(response);
    });
  });
}

router.post('/products', async (req: Request, res: Response) => {
  if (!req.body) {
    return res.status(400).json({ message: 'Invalid request' });
  }

  try {
    const response = await unaryCall('AddProduct', { product: req.body });
    return res.json(response);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

router.put('/products', async (req: Request, res: Response) => {
  if (!req.body) {
    return res.status(400).json({ message: 'Invalid request' });
  }

  try {
    const response = await unaryCall('UpdateProduct', req.body);
    return res.json(response);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

router.post('/products/archive', async (req: Request, res: Response) => {
  if (!req.body) {
    return res.status(400).json({ message: 'Invalid request' });
  }

  try {
    const response = await unaryCall('ArchiveProduct', req.body);
    return res.json(response);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

router.post('/categories', async (req: Request, res: Response) => {
  if (!req.body?.name) {
    return res.status(400).json({ message: 'Category name is required' });
  }

  try {
    const response = await unaryCall('AddCategory', { name: req.body.name });
    return res.status(201).json(response);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

router.post('/categories/tree', async (req: Request, res: Response) => {
  if (!req.body?.name) {
    return res.status(400).json({ message: 'Category tree root is required' });
  }

  try {
    const response = await unaryCall('AddCategoryTree', { category: req.body });
    return res.status(201).json(response);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

router.put('/categories/:categoryId', async (req: Request, res: Response) => {
  const { categoryId } = req.params;

  try {
    const response = await unaryCall('UpdateCategory', {
      categoryId,
      ...req.body,
    });
    return res.json(response);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

router.post('/categories/:categoryId/archive', async (req: Request, res: Response) => {
  const { categoryId } = req.params;

  try {
    const response = await unaryCall('ArchiveCategory', { categoryId });
    return res.json(response);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

router.post('/sync/algolia', async (req: Request, res: Response) => {
  if (!req.body) {
    return res.status(400).json({ message: 'Invalid request' });
  }

  try {
    const response = await unaryCall('SyncToAlgolia', req.body);
    return res.json(response);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

router.get('/categories/tree/:productId', async (req: Request, res: Response) => {
  const { productId } = req.params;

  if (!productId) {
    return res.status(400).json({ message: 'Invalid productId' });
  }

  try {
    const response = await unaryCall('GetCategoryTree', { productId });
    return res.json(response);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

router.get('/categories/filters/:categoryId', async (req: Request, res: Response) => {
  const { categoryId } = req.params;

  if (!categoryId) {
    return res.status(400).json({ message: 'Invalid categoryId' });
  }

  try {
    const response = await unaryCall('GetFilterAttributes', { categoryId });
    return res.json(response);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

router.get('/search/:query', async (req: Request, res: Response) => {
  const { query } = req.params;

  if (!query) {
    return res.status(400).json({ message: 'Invalid query' });
  }

  try {
    const response = await unaryCall('SearchProducts', { query });
    return res.json(response);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

router.get('/category/:categorySlug', async (req: Request, res: Response) => {
  const { categorySlug } = req.params;

  if (!categorySlug) {
    return res.status(400).json({ message: 'Invalid categorySlug' });
  }

  try {
    const response = await unaryCall('GetProductsByCategory', { categorySlug });
    return res.json(response);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

router.get('/related/:productId', async (req: Request, res: Response) => {
  const { productId } = req.params;

  if (!productId) {
    return res.status(400).json({ message: 'Invalid productId' });
  }

  try {
    const response = await unaryCall('GetRelatedProducts', { productId });
    return res.json(response);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

router.get('/featured', async (_req: Request, res: Response) => {
  try {
    const response = await unaryCall('GetFeaturedProducts', {});
    return res.json(response);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

router.get('/products/:productId', async (req: Request, res: Response) => {
  const { productId } = req.params;

  if (!productId) {
    return res.status(400).json({ message: 'Invalid productId' });
  }

  try {
    const response = await unaryCall('GetProductDetails', { productId });
    return res.json(response);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

export default router;
