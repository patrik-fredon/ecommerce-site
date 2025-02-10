import { useState } from 'react';
import Layout from '../components/Layout';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqs: FAQItem[] = [
  {
    question: 'How long does shipping take?',
    answer: 'Standard shipping usually takes 3-5 business days within the continental US. International shipping can take 7-14 business days depending on the destination.',
    category: 'Shipping'
  },
  {
    question: 'What is your return policy?',
    answer: 'We offer a 30-day return policy for unused items in their original packaging. Contact our customer service team to initiate a return.',
    category: 'Returns'
  },
  {
    question: 'Do you ship internationally?',
    answer: 'Yes, we ship to most countries worldwide. Shipping costs and delivery times vary by location.',
    category: 'Shipping'
  },
  {
    question: 'How can I track my order?',
    answer: 'Once your order ships, you will receive a confirmation email with tracking information. You can also track your order through your account dashboard.',
    category: 'Orders'
  },
  {
    question: 'Are my payment details secure?',
    answer: 'Yes, we use industry-standard encryption to protect your payment information. We never store your full credit card details.',
    category: 'Payment'
  },
  {
    question: 'Can I modify or cancel my order?',
    answer: 'Orders can be modified or cancelled within 1 hour of placement. Contact customer service immediately for assistance.',
    category: 'Orders'
  },
  {
    question: 'Do you offer gift wrapping?',
    answer: 'Yes, gift wrapping is available for an additional $5 per item. You can select this option during checkout.',
    category: 'Services'
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept major credit cards (Visa, MasterCard, American Express), PayPal, and Apple Pay.',
    category: 'Payment'
  }
];

export default function FAQ() {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  const categories = Array.from(new Set(faqs.map(faq => faq.category)));

  const toggleItem = (index: string) => {
    setOpenItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-extrabold text-gray-900 text-center mb-4">
          Frequently Asked Questions
        </h1>
        <p className="text-lg text-gray-600 text-center mb-12">
          Find answers to common questions about our products and services
        </p>

        <div className="space-y-12">
          {categories.map(category => (
            <div key={category}>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                {category}
              </h2>
              <div className="space-y-4">
                {faqs
                  .filter(faq => faq.category === category)
                  .map((faq, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-lg"
                    >
                      <button
                        onClick={() => toggleItem(`${category}-${index}`)}
                        className="w-full text-left px-6 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex justify-between items-center"
                      >
                        <span className="text-lg font-medium text-gray-900">
                          {faq.question}
                        </span>
                        <ChevronDownIcon
                          className={`w-5 h-5 text-gray-500 transform transition-transform ${
                            openItems[`${category}-${index}`] ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      {openItems[`${category}-${index}`] && (
                        <div className="px-6 pb-4">
                          <p className="text-gray-600">{faq.answer}</p>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Still have questions?
          </h3>
          <p className="text-gray-600 mb-6">
            Can't find the answer you're looking for? Please contact our customer support team.
          </p>
          <button
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            onClick={() => window.location.href = 'mailto:support@ecoshop.com'}
          >
            Contact Support
          </button>
        </div>
      </div>
    </Layout>
  );
}
