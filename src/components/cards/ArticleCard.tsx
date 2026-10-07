import { Link } from "react-router-dom";
import { Card, CardImage, CardBody } from "@/components/cards/Card";
import { Badge } from "@/components/ui/Badge";
import { ROUTES } from "@/constants/routes";
import { formatDate } from "@/utils/formatDate";
import type { Article, Category } from "@/types/firestore";

interface ArticleCardProps {
  article: Article;
  category?: Category;
}

/** ArticleCard - the shared card for articles across the public site (Document 06). */
export function ArticleCard({ article, category }: ArticleCardProps) {
  return (
    <Link to={ROUTES.article(article.slug)}>
      <Card interactive>
        <CardImage>
          {article.coverImageUrl ? (
            <img
              src={article.coverImageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-caption text-text-secondary">
              DG Tribune
            </div>
          )}
        </CardImage>
        <CardBody>
          {category && (
            <Badge variant="accent" className="mb-2">
              {category.name}
            </Badge>
          )}
          <h3 className="font-heading text-card-title text-text line-clamp-2 mb-1">
            {article.title}
          </h3>
          <p className="text-small text-text-secondary line-clamp-2 mb-2">
            {article.excerpt}
          </p>
          <p className="text-caption text-text-secondary">
            {formatDate(article.updatedAt)}
          </p>
        </CardBody>
      </Card>
    </Link>
  );
}
