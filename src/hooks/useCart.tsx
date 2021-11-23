import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const alreadyOnCart = cart.find(product => product.id === productId);
      
      if (alreadyOnCart) {
        return updateProductAmount({
          productId,
          amount: alreadyOnCart.amount + 1,
        });
      }

      const { data: item } = await api.get<Omit<Product, 'amount'>>(`products/${productId}`);

      setCart(state => {
        const newState = [...state, { ...item, amount: 1 } ]

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newState));
        return newState;
      });

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productOnCart = cart.some(product => product.id === productId);

      if (!productOnCart) {
        toast.error('Erro na remoção do produto');

        return;
      }

      const parsedProducts = cart.filter(product => product.id !== productId);

      setCart(parsedProducts);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(parsedProducts));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return

      const { data: stockData } = await api.get<Stock>(`stock/${productId}`);

      if (amount > stockData.amount) {
        toast.error('Quantidade solicitada fora de estoque')
        return;
      };

      const parsedProducts = cart.map(product => {
        if (product.id === productId) {
          return {
            ...product,
            amount,
          }
        }
        
        return product;
      });

      setCart(parsedProducts);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(parsedProducts));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
